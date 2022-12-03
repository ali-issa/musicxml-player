import { Player } from '.';

const html = `
<!DOCTYPE html>
<html>
    <head>
        <title>MusicXML Player Demo</title>
    </head>
    <body>
        <h1>MusicXML Player</h1>
        <div id="sheet"></div>
    </body>
</html>
`.trim();

const musicXml = `
<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<!DOCTYPE score-partwise PUBLIC
    "-//Recordare//DTD MusicXML 4.0 Partwise//EN"
    "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="4.0">
  <part-list>
    <score-part id="P1">
      <part-name>Music</part-name>
    </score-part>
  </part-list>
  <part id="P1">
    <measure number="1">
      <attributes>
        <divisions>1</divisions>
        <key>
          <fifths>0</fifths>
        </key>
        <time>
          <beats>4</beats>
          <beat-type>4</beat-type>
        </time>
        <clef>
          <sign>G</sign>
          <line>2</line>
        </clef>
      </attributes>
      <note>
        <pitch>
          <step>C</step>
          <octave>4</octave>
        </pitch>
        <duration>4</duration>
        <type>whole</type>
      </note>
    </measure>
  </part>
</score-partwise>
`.trim();

// https://stackoverflow.com/a/60225417/209184
window.HTMLElement.prototype.scrollIntoView = jest.fn()

describe('Player', () => {
  beforeEach(() => {
    document.documentElement.innerHTML = html.toString();
  });

  it('instantiates the player', async () => {
    const player = await Player.load(musicXml, 'sheet');
    expect(player).not.toBeNull();
  });
});
