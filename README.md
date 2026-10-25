# Elbstrand

Eine animierte Ölmalerei vom Elbstrand bei Blankenese: Leuchtturm aus der Vogelperspektive, bewegtes Wasser und ein wandernder Lichtkegel. Freie künstlerische Interpretation.

Die Seite zeigt ausschließlich die Landschaft und die Bedienelemente unten rechts: Abendlicht/Nacht, optionaler Wasserklang und Pause.

## Technik

Statisches HTML, CSS und Canvas 2D. Keine Installation, Abhängigkeiten, API-Schlüssel oder externen Schriftarten. `index.html` über einen statischen Webserver ausliefern. GitHub Pages veröffentlicht den Branch `main` aus dem Stammverzeichnis.

Die Animation verwendet genau einen weichen Lichtkegel mit 24 Sekunden Umlaufzeit. Wasserreflexe sind auf denselben Kegel begrenzt. Keine separate Bodenaufhellung hinzufügen: Sie erzeugt einen sichtbaren Doppelstrahl. Die Laterne liegt im Originalbild (1536 × 1024) bei (956, 303), der Turmfuß bei (957, 483). Alle Ebenen teilen denselben responsiven Bildausschnitt.

30 Bilder pro Sekunde, maximal 1,5-fache Pixeldichte. Die Animation pausiert in ausgeblendeten Tabs und berücksichtigt `prefers-reduced-motion`. Der optionale synthetische Wasserklang startet erst nach einem Klick.

## Bild

Das Bild wurde mit Imagegen als Ölmalerei gestaltet; die Animation entsteht im Browser. Es ist keine maßstabsgetreue oder historische Rekonstruktion.
