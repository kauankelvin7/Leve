import type { SeasonalCalendarMarker as SeasonalCalendarMarkerModel } from '../../platform/seasonal/seasonalCalendarMarkers';
import { SeasonalGlyph } from './SeasonalGlyph';

type SeasonalCalendarMarkerProps = {
  marker: SeasonalCalendarMarkerModel;
  compact?: boolean;
};

export function SeasonalCalendarMarker({ marker, compact = false }: SeasonalCalendarMarkerProps) {
  return (
    <span
      className={`seasonal-calendar-marker seasonal-calendar-marker-${marker.eventId}${compact ? ' compact' : ''}`}
      data-seasonal-calendar-event={marker.eventId}
      aria-hidden="true"
    >
      <SeasonalGlyph eventId={marker.eventId} />
    </span>
  );
}
