import type { ISheetPlayback } from './ISheetPlayback';
import type { Player } from './Player';
import {
  Fraction,
  MusicPartManagerIterator,
  OpenSheetMusicDisplay,
  SourceMeasure,
  VexFlowVoiceEntry
} from 'opensheetmusicdisplay';

export class OpenSheetMusicDisplayPlayback implements ISheetPlayback {
  private osmd: OpenSheetMusicDisplay | null;
  private currentMeasureIndex: number;
  private currentVoiceEntryIndex: number;

  constructor(private player: Player) {
    this.osmd = null;
    this.currentMeasureIndex = 0;
    this.currentVoiceEntryIndex = 0;
  }

  async initialize(musicXml: string, container: HTMLDivElement | string) : Promise<void> {
    this.osmd = new OpenSheetMusicDisplay(container, {
      backend: 'svg',
      drawFromMeasureNumber: 1,
      drawUpToMeasureNumber: Number.MAX_SAFE_INTEGER, // draw all measures, up to the end of the sample
      newSystemFromXML: true,
      newPageFromXML: true,
      followCursor: true,
      disableCursor: false,
      autoResize: false,
    });
    this.osmd.EngravingRules.resetChordAccidentalTexts(this.osmd.EngravingRules.ChordAccidentalTexts, true);
    this.osmd.EngravingRules.resetChordSymbolLabelTexts(this.osmd.EngravingRules.ChordSymbolLabelTexts);
    await this.osmd.load(musicXml);
    this.osmd.render();
    this.osmd.cursor.show();

    // Setup event listeners for target stave notes to position the cursor.
    this.osmd.GraphicSheet.MeasureList.forEach(measureGroup => {
      measureGroup.forEach(measure => {
        measure.staffEntries.forEach((se, v) => {
          se.graphicalVoiceEntries.forEach(gve => {
            const vfve = <VexFlowVoiceEntry>gve;
            (<HTMLElement>vfve.vfStaveNote.getAttribute('el')).addEventListener('click', () => {
              this.updateCursor(measure.MeasureNumber-1, v);
              this.player.seek(measure.MeasureNumber-1, this.timestampToMillisecs(measure.parentSourceMeasure, se.relInMeasureTimestamp));
            });
          });
        });
      });
    });
  }

  // Staff entry timestamp to actual time relative to measure start.
  timestampToMillisecs(measure: SourceMeasure, timestamp: Fraction) {
    return timestamp.RealValue * 4 * 60 * 1000 / measure.TempoInBPM;
  }

  updateCursor(measureIndex: number, voiceEntryIndex: number) {
    const osmd = this.osmd!;
    const measure = osmd.Sheet.SourceMeasures[measureIndex]!;
    const vsse = measure.VerticalSourceStaffEntryContainers[voiceEntryIndex]!;

    this.currentMeasureIndex = measureIndex;
    this.currentVoiceEntryIndex = voiceEntryIndex;

    if (measureIndex === 0 && voiceEntryIndex === 0) {
      osmd.cursor.reset();
    }
    else {
      const startTimestamp = measure.AbsoluteTimestamp.clone();
      startTimestamp.Add(vsse.Timestamp);
      osmd.cursor.iterator = new MusicPartManagerIterator(osmd.Sheet, startTimestamp, undefined);
      osmd.cursor.update();
    }
  }

  moveToMeasureTime(measureIndex: number, measureMillisecs: number): void {
    const osmd = this.osmd!;
    const measure = osmd.Sheet.SourceMeasures[measureIndex]!;

    // If we're moving to a new measure, then start at the first staff entry without search.
    if (this.currentMeasureIndex !== measureIndex) {
      this.updateCursor(measureIndex, 0);
      return;
    }

    // Same measure, new time.
    for (let v = measure.VerticalSourceStaffEntryContainers.length-1; v >= 0; v--) {
      const vsse = measure.VerticalSourceStaffEntryContainers[v]!;

      if (this.timestampToMillisecs(measure, vsse.Timestamp) <= measureMillisecs + Number.EPSILON) {
        // If same staff entry, do nothing.
        if (this.currentVoiceEntryIndex !== v) {
          this.updateCursor(measureIndex, v);
        }
        return;
      }
    }
    console.error(`Could not find suitable staff entry at time ${measureMillisecs} for measure ${measure.MeasureNumber}`);
  }
}
