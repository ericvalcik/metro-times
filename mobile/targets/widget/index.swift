import WidgetKit
import SwiftUI

// Static widget — no live data (no App Group on a free Apple ID). A single
// timeline entry is enough; the widget never updates its content.
struct MetroEntry: TimelineEntry {
    let date: Date
}

struct Provider: TimelineProvider {
    func placeholder(in context: Context) -> MetroEntry {
        MetroEntry(date: Date())
    }

    func getSnapshot(in context: Context, completion: @escaping (MetroEntry) -> Void) {
        completion(MetroEntry(date: Date()))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<MetroEntry>) -> Void) {
        // Single entry, never reload — the glyph is static.
        completion(Timeline(entries: [MetroEntry(date: Date())], policy: .never))
    }
}

// The Prague metro "M" (downward-arrow mark) drawn straight from its vector
// outline so the widget never depends on an image/symbol asset loading. Source
// artwork lives in a 21×22 coordinate space; the inner subpath is the counter,
// cut out with an even-odd fill. Tinting is left to the fill color the view
// applies, so the lock screen's single-color rendering owns it.
struct MetroGlyphShape: Shape {
    func path(in rect: CGRect) -> Path {
        let srcW: CGFloat = 21
        let srcH: CGFloat = 22
        let scale = min(rect.width / srcW, rect.height / srcH)
        let originX = rect.minX + (rect.width - srcW * scale) / 2
        let originY = rect.minY + (rect.height - srcH * scale) / 2
        func p(_ x: CGFloat, _ y: CGFloat) -> CGPoint {
            CGPoint(x: originX + x * scale, y: originY + y * scale)
        }

        var path = Path()
        // Outer outline.
        path.move(to: p(4.85689, 0))
        path.addLine(to: p(4.85689, 8.04584))
        path.addLine(to: p(0, 8.04584))
        path.addLine(to: p(0, 10.5954))
        path.addLine(to: p(10.5, 22))
        path.addLine(to: p(21, 10.5954))
        path.addLine(to: p(21, 8.04584))
        path.addLine(to: p(16.1432, 8.04584))
        path.addLine(to: p(16.1432, 0))
        path.addLine(to: p(13.445, 0))
        path.addLine(to: p(10.5, 3.60308))
        path.addLine(to: p(7.55508, 0))
        path.closeSubpath()
        // Inner counter (cut out via even-odd fill).
        path.move(to: p(7.4472, 3.74043))
        path.addLine(to: p(10.5, 7.49617))
        path.addLine(to: p(13.5529, 3.74043))
        path.addLine(to: p(13.5529, 10.5802))
        path.addLine(to: p(17.423, 10.5802))
        path.addLine(to: p(10.5, 18.0458))
        path.addLine(to: p(3.57711, 10.5802))
        path.addLine(to: p(7.4472, 10.5802))
        path.closeSubpath()
        return path
    }
}

struct MetroTimesWidgetEntryView: View {
    var entry: Provider.Entry

    // The metro "M", inset and made tappable. Unlock → launch app →
    // /widget-entry, which redirects to the departures index (/). Routing
    // through a dedicated entry route (rather than the bare "metrotimes://")
    // forces a real navigation to the Times tab instead of restoring whatever
    // tab was last focused.
    private var glyph: some View {
        MetroGlyphShape()
            .fill(style: FillStyle(eoFill: true))
            .padding(14)
            .widgetURL(URL(string: "metrotimes://widget-entry"))
    }

    var body: some View {
        // iOS 17+ REQUIRES every widget to declare its background via
        // .containerBackground(for: .widget); without it the system refuses to
        // render the content and shows an "unavailable / please update"
        // placeholder. AccessoryWidgetBackground is the faint circle the lock
        // screen draws behind accessory widgets.
        if #available(iOS 17.0, *) {
            glyph.containerBackground(for: .widget) {
                AccessoryWidgetBackground()
            }
        } else {
            ZStack {
                AccessoryWidgetBackground()
                glyph
            }
        }
    }
}

@main
struct MetroTimesWidget: Widget {
    let kind: String = "MetroTimesWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: Provider()) { entry in
            MetroTimesWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("Metro Times")
        .description("Open Metro Times to your nearest departures.")
        .supportedFamilies([.accessoryCircular])
    }
}
