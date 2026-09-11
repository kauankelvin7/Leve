import { useEffect, useRef } from 'react';

const vertexShader = `void main(){gl_Position=vec4(position,1.0);}`;
const fragmentShader = `
uniform vec2 u_resolution; uniform vec2 u_mouse; uniform float u_time; uniform sampler2D u_noise; uniform sampler2D u_buffer; uniform bool u_renderpass;
const float PI=3.141592653589793; const int samples=8; const float sigma=2.0;
float gaussian(vec2 i){return 1.0/(2.0*PI*sigma*sigma)*exp(-dot(i,i)/(2.0*sigma*sigma));}
vec3 hash33(vec3 p){float n=sin(dot(p,vec3(7.,157.,113.)));return fract(vec3(2097152.,262144.,32768.)*n);}
vec3 blur9(sampler2D image,vec2 uv,vec2 px){vec3 col=vec3(0.);float total=0.;for(int x=-4;x<4;x++){for(int y=-4;y<4;y++){float w=gaussian(vec2(float(x),float(y)));col+=texture2D(image,uv+px*vec2(float(x),float(y))).rgb*w;total+=w;}}return col/total;}
void main(){vec2 uv=(gl_FragCoord.xy-.5*u_resolution)/u_resolution.y;uv*=4.;vec2 mouse=u_mouse*4.;vec2 sampleUv=gl_FragCoord.xy/u_resolution;vec2 origin=mouse*.2+vec2(.65,.5);sampleUv=.98*(sampleUv-origin)+origin;sampleUv+=vec2(sin((u_time+uv.y*.5)*10.)*.001,0.);vec4 tex;vec3 light=vec3(0.);
if(u_renderpass){tex=vec4(blur9(u_buffer,sampleUv,vec2(1.)/u_resolution*.98)*.95,1.);float d=length(mouse-uv);light=vec3(smoothstep(.25,0.,d));}else{tex=texture2D(u_buffer,sampleUv)*.98;tex=vec4(smoothstep(0.,.5-fwidth(tex.x),tex.x),smoothstep(.2,.7-fwidth(tex.y),tex.y),smoothstep(-.05,.3-fwidth(tex.z),tex.z),1.);tex.rgb+=hash33(vec3(uv,u_time*.1))*.12-.06;}gl_FragColor=vec4(light,1.)+tex;}`;

export function AuthBackdrop() {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = host.current;
    const enabled = matchMedia('(min-width: 900px) and (pointer: fine)').matches && !matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!element || !enabled) return;
    let disposed = false; let frame = 0; let cleanup = () => {};
    void import('three').then(THREE => {
      if (disposed) return;
      const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false, powerPreference: 'low-power' });
      renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5)); element.appendChild(renderer.domElement);
      const camera = new THREE.Camera(); camera.position.z = 1; const scene = new THREE.Scene();
      const noiseData = new Uint8Array(16 * 16 * 4); crypto.getRandomValues(noiseData); const noise = new THREE.DataTexture(noiseData, 16, 16); noise.wrapS = noise.wrapT = THREE.RepeatWrapping; noise.needsUpdate = true;
      let first = new THREE.WebGLRenderTarget(1, 1); let second = new THREE.WebGLRenderTarget(1, 1);
      const uniforms = { u_time: { value: 0 }, u_resolution: { value: new THREE.Vector2() }, u_noise: { value: noise }, u_buffer: { value: first.texture }, u_mouse: { value: new THREE.Vector2() }, u_renderpass: { value: false } };
      const material = new THREE.ShaderMaterial({ uniforms, vertexShader, fragmentShader }); scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material));
      const pointer = new THREE.Vector2();
      const resize = () => { const rect = element.getBoundingClientRect(); renderer.setSize(rect.width, rect.height, false); uniforms.u_resolution.value.set(renderer.domElement.width, renderer.domElement.height); first.dispose(); second.dispose(); first = new THREE.WebGLRenderTarget(Math.max(1, rect.width * .2), Math.max(1, rect.height * .2)); second = first.clone(); };
      const move = (event: PointerEvent) => { const rect = element.getBoundingClientRect(); const ratio = rect.height / rect.width; pointer.set((event.clientX - rect.left - rect.width / 2) / rect.width / ratio, -(event.clientY - rect.top - rect.height / 2) / rect.height); };
      const startedAt = performance.now(); const render = () => { uniforms.u_mouse.value.lerp(pointer, .1); uniforms.u_time.value = (performance.now() - startedAt) / 1000; const full = uniforms.u_resolution.value.clone(); uniforms.u_resolution.value.set(first.width, first.height); uniforms.u_buffer.value = second.texture; uniforms.u_renderpass.value = true; renderer.setRenderTarget(first); renderer.render(scene, camera); [first, second] = [second, first]; uniforms.u_buffer.value = second.texture; uniforms.u_resolution.value.copy(full); uniforms.u_renderpass.value = false; renderer.setRenderTarget(null); renderer.render(scene, camera); frame = requestAnimationFrame(render); };
      resize(); element.addEventListener('pointermove', move); window.addEventListener('resize', resize); render();
      cleanup = () => { cancelAnimationFrame(frame); element.removeEventListener('pointermove', move); window.removeEventListener('resize', resize); material.dispose(); noise.dispose(); first.dispose(); second.dispose(); renderer.dispose(); renderer.domElement.remove(); };
    }).catch(() => { element.dataset.effectUnavailable = 'true'; });
    return () => { disposed = true; cleanup(); };
  }, []);
  return <div ref={host} className="auth-backdrop" aria-hidden="true" />;
}
