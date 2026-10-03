# Gika v1 — Facial Character Scope

Status: **APPROVED PRODUCT SCOPE**

Approved by the user after Gate A failed to preserve the full-body character identity.

## Product decision

The Gika v1 character is a **facial/portrait presence inside the chat**, not a full-body articulated character.

The full-body rig, articulated arms/hands, props and body gestures are **deferred** and are **not release blockers** for M9.

This decision supersedes any earlier requirement that made a full-body or half-body production rig mandatory for v1.

The existing approved facial/portrait baseline remains the visual authority.

## Why

Gate A demonstrated that reconstructing a new rig-ready body source from the flattened model sheet changed face, hair, silhouette and proportions enough to create a different character.

The product must preserve Gika's identity rather than force a lower-quality full-body reconstruction.

The existing facial/portrait implementation already has a technically valid Rive/runtime/controller path. Therefore v1 will keep only motions/expressions that remain natural and visually faithful.

## Approved v1 visual surface

Primary product usage:
- welcome/empty chat: portrait presentation;
- active conversation: compact portrait/avatar in the chat/header;
- no simultaneous duplicate character;
- no body scene required.

Allowed:
- neutral/rest;
- idle;
- blink;
- listening, if visually natural;
- thinking, if visually natural;
- clarify, if visually natural;
- success, only if visually natural and aligned;
- error, if visually natural;
- offline, if visually natural;
- subtle eye/head/brow/mouth motion derived from the approved master;
- reduced-motion state-specific static equivalents;
- fallback derived from the same approved identity.

Not required:
- full-body rig;
- half-body rig;
- articulated shoulders/arms/hands;
- hand-on-chin gesture;
- wave body gesture;
- tablet/phone/mug/heart;
- full-body celebrate;
- new body poses;
- 3D reconstruction;
- new character redesign.

## Quality rule

**Fewer excellent expressions are preferred over more mediocre expressions.**

A visual state is included only if:
1. it is recognizably the same Gika;
2. no hair/face/mecha identity drift occurs;
3. no collage/cutout appearance occurs;
4. transition looks natural at real product size;
5. light/dark preserve identical character RGBA;
6. reduced motion has a safe static equivalent.

If a state fails, map it to the nearest approved visual state instead of forcing a unique asset.

## Semantic → visual fallback mapping

The semantic controller may keep its richer product states. Visual uniqueness is not mandatory.

Suggested fallback mapping:

- hello → idle/smile
- rest → idle/rest
- listening → listening if approved; otherwise attentive idle
- thinking → thinking if approved; otherwise focused idle
- clarify → clarify if approved; otherwise attentive/curious
- confirm → clarify/attentive
- success → success if approved; otherwise smile/idle
- celebrate → success
- attention → error-light/clarify
- error → error if approved; otherwise concerned idle
- offline → offline if approved; otherwise calm static idle
- resting → rest

The LLM never chooses the visual state. Product fact → deterministic controller → visual adapter.

## Current baseline to preserve

Preserve the current stable facial implementation restored before Gate A:
- approved Neutral Master;
- facial rig;
- blink;
- existing good facial expressions;
- semantic controller;
- Rive runtime/integration;
- lazy loading;
- fallback;
- reduced motion;
- dev character playground;
- privacy/event contracts.

Do not reintroduce rejected raster gesture overlays.

## Review process

The next pass is **not an art reconstruction project**.

It is a bounded facial-expression quality pass:

1. inventory existing facial states;
2. render each at actual product sizes;
3. classify KEEP / TUNE / FALLBACK;
4. apply only localized corrections;
5. reject any state requiring broad redraw;
6. integrate only the natural set;
7. run focused visual/runtime tests;
8. stop for human review before final M9 regression.

## Human-review target

Provide:
- one short video or equivalent real-runtime sequence;
- welcome portrait;
- active-chat compact portrait;
- each retained expression/state;
- light/dark;
- reduced motion;
- transitions;
- no labels first where practical, labels second for verification.

Result must be reported as:

`GIKA_V1_FACIAL_REVIEW_REQUIRED`

Do not declare M9 done until human visual approval and final regression.

## Deferred future exploration

A future Gika 2.x may explore:
- professionally authored layered PSD/SVG;
- full-body Rive rig;
- Spine;
- Live2D;
- Blender/3D/image-to-3D experiments.

None of those are dependencies for Gika v1 or M9 release.
