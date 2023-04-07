import { parseArrayBuffer as parseMidiBuffer } from 'midi-json-parser';
import type { IMidiFile } from 'midi-json-parser-worker';
import createVerovioModule from 'verovio/wasm';
import { VerovioToolkit } from 'verovio/esm';
import type { IMidiConverter, MeasureTimemap } from './IMidiConverter';
import type { MeasureIndex } from './Player';
import type { TimeMapEntryFixed } from './VerovioRenderer';

export class VerovioConverter implements IMidiConverter {
  private _vrv: VerovioToolkit | null;
  private _timemap: MeasureTimemap;
  private _midi: IMidiFile | null;

  constructor() {
    this._vrv = null;
    this._timemap = [];
    this._midi = null;
  }

  async initialize(musicXml: string): Promise<void> {
    const VerovioModule = await createVerovioModule();
    this._vrv = new VerovioToolkit(VerovioModule);
    this._vrv.setOptions({
      expand: 'expansion-repeat'
    });
    if (!this._vrv.loadData(musicXml)) {
      throw 'TODO';
    }

    // Build timemap.
    let measureIndex: MeasureIndex = 0;
    this._vrv
    .renderToTimemap({ includeMeasures: true })
    .forEach((e) => {
      const event = <TimeMapEntryFixed>e;
      if ('measureOn' in event) {
        this._timemap.push({
          measure: measureIndex++,
          timestamp: event.tstamp
        });
      }
    });

    // Render to MIDI.
    this._midi = await parseMidiBuffer(
      VerovioConverter._base64ToArrayBuffer(
        this._vrv.renderToMIDI()
      )
    );
  }

  get midi(): IMidiFile {
    if (!this._midi) throw 'TODO';
    return this._midi;
  }

  get timemap(): MeasureTimemap {
    return this._timemap;
  }

  get version(): string {
    if (!this._vrv) throw 'TODO';
    return `verovio v${this._vrv.getVersion()}`;
  }

  private static _base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary_string = window.atob(base64);
    const len = binary_string.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary_string.charCodeAt(i);
    }
    return bytes.buffer;
  }
}
