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

struct MetroTimesWidgetEntryView: View {
    var entry: Provider.Entry

    var body: some View {
        ZStack {
            // Faint circular backing the system draws behind accessory widgets.
            AccessoryWidgetBackground()
            // .template so the lock screen's single-tint rendering owns the color.
            Image("MetroGlyph")
                .resizable()
                .renderingMode(.template)
                .aspectRatio(contentMode: .fit)
                .padding(6)
        }
        // Unlock → launch app → /widget-entry, which redirects to the departures
        // index (/). Routing through a dedicated entry route (rather than the bare
        // "metrotimes://") forces a real navigation to the Times tab instead of
        // restoring whatever tab was last focused.
        .widgetURL(URL(string: "metrotimes://widget-entry"))
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
