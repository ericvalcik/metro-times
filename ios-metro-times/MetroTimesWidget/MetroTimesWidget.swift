import WidgetKit
import SwiftUI
import Intents

// Widget entry that contains the data to display
struct DepartureEntry: TimelineEntry {
    let date: Date
    let stops: [Stop]
    let departures: [Departure]
    let configuration: ConfigurationIntent
}

// Widget provider that fetches data and creates timeline entries
struct Provider: IntentTimelineProvider {
    func placeholder(in context: Context) -> DepartureEntry {
        // Placeholder data for widget gallery
        DepartureEntry(
            date: Date(),
            stops: [],
            departures: [],
            configuration: ConfigurationIntent()
        )
    }

    func getSnapshot(for configuration: ConfigurationIntent, in context: Context, completion: @escaping (DepartureEntry) -> ()) {
        // Snapshot data for widget gallery
        let entry = DepartureEntry(
            date: Date(),
            stops: [],
            departures: [],
            configuration: configuration
        )
        completion(entry)
    }

    func getTimeline(for configuration: ConfigurationIntent, in context: Context, completion: @escaping (Timeline<DepartureEntry>) -> ()) {
        Task {
            do {
                // Get the user's location and find nearby stops
                let locationManager = LocationManager.shared
                let allStops = StopsData.loadStops()
                let nearbyStops = locationManager.findNearbyStops(
                    allStops: allStops,
                    limit: Configuration.widgetMaxStopsToDisplay
                )
                
                // Get stop IDs for API request
                let stopIds = nearbyStops.flatMap { $0.stops }
                
                // Fetch departures
                let departures = try await DepartureService.shared.fetchDepartures(for: stopIds)
                
                // Create entry with fetched data
                let entry = DepartureEntry(
                    date: Date(),
                    stops: nearbyStops,
                    departures: departures,
                    configuration: configuration
                )
                
                // Create timeline with refresh interval
                let nextUpdateDate = Calendar.current.date(
                    byAdding: .second,
                    value: Int(Configuration.widgetRefreshInterval),
                    to: Date()
                )!
                
                let timeline = Timeline(
                    entries: [entry],
                    policy: .after(nextUpdateDate)
                )
                
                completion(timeline)
            } catch {
                // Handle error by creating an empty timeline
                let entry = DepartureEntry(
                    date: Date(),
                    stops: [],
                    departures: [],
                    configuration: configuration
                )
                
                let timeline = Timeline(
                    entries: [entry],
                    policy: .after(Date().addingTimeInterval(60))
                )
                
                completion(timeline)
            }
        }
    }
}

// Widget view that displays the data
struct MetroTimesWidgetEntryView : View {
    var entry: Provider.Entry
    @Environment(\.widgetFamily) var family
    
    var body: some View {
        VStack(spacing: 8) {
            ForEach(entry.stops.prefix(Configuration.widgetMaxStopsToDisplay)) { stop in
                StopDepartureGroupView(
                    stop: stop,
                    allDepartures: entry.departures,
                    currentTime: entry.date
                )
            }
        }
        .padding()
        .background(Color(UIColor.systemBackground))
    }
}

// StopDepartureGroup component that mimics the web component
struct StopDepartureGroupView: View {
    let stop: Stop
    let allDepartures: [Departure]
    let currentTime: Date
    
    // Filter departures for this stop and remove duplicates
    var stopDepartures: [Departure] {
        let filtered = allDepartures.filter { departure in
            stop.stops.contains(departure.stop.id)
        }
        
        // Remove duplicates based on headsign (direction)
        var uniqueDepartures: [Departure] = []
        var seenHeadsigns: Set<String> = []
        
        for departure in filtered {
            if !seenHeadsigns.contains(departure.trip.headsign) {
                uniqueDepartures.append(departure)
                seenHeadsigns.insert(departure.trip.headsign)
            }
        }
        
        return Array(uniqueDepartures.prefix(Configuration.maxDeparturesPerStop))
    }
    
    var body: some View {
        if !stopDepartures.isEmpty {
            VStack(alignment: .leading, spacing: 8) {
                // Stop header
                HStack {
                    // Metro icon with type color
                    Circle()
                        .fill(Color(hex: stop.type.color))
                        .frame(width: 12, height: 12)
                    
                    // Stop name
                    Text(stop.name)
                        .font(.headline)
                        .foregroundColor(.white)
                    
                    Spacer()
                    
                    // Distance (optional)
                    if let distance = stop.distance {
                        Text(formatDistance(distance))
                            .font(.caption)
                            .foregroundColor(.gray)
                    }
                }
                
                // Departures
                ForEach(stopDepartures) { departure in
                    DepartureView(
                        departure: departure,
                        currentTime: currentTime
                    )
                }
            }
            .padding()
            .background(Color(hex: "#131313"))
            .cornerRadius(24)
        }
    }
    
    // Format distance in meters or kilometers
    private func formatDistance(_ distance: Double) -> String {
        let roundedMeters = Int(round(distance / 10) * 10)
        if roundedMeters < 1000 {
            return "~\(roundedMeters)m"
        } else {
            return String(format: "~%.1fkm", Double(roundedMeters) / 1000)
        }
    }
}

// Individual departure row
struct DepartureView: View {
    let departure: Departure
    let currentTime: Date
    
    var body: some View {
        HStack {
            // Direction/Headsign
            Text(departure.parsedDeparture.direction)
                .font(.subheadline)
                .foregroundColor(.white)
            
            Spacer()
            
            // Time remaining
            Text(departure.formattedTimeRemaining(currentTime: currentTime))
                .font(.subheadline)
                .foregroundColor(.white)
        }
    }
}

// Widget definition
struct MetroTimesWidget: Widget {
    let kind: String = "MetroTimesWidget"

    var body: some WidgetConfiguration {
        IntentConfiguration(kind: kind, intent: ConfigurationIntent.self, provider: Provider()) { entry in
            MetroTimesWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("Metro Times")
        .description("Shows upcoming metro departures from nearby stops.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

// Helper extension to create Color from hex string
extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch hex.count {
        case 3: // RGB (12-bit)
            (a, r, g, b) = (255, (int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
        case 6: // RGB (24-bit)
            (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8: // ARGB (32-bit)
            (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default:
            (a, r, g, b) = (255, 0, 0, 0)
        }
        self.init(
            .sRGB,
            red: Double(r) / 255,
            green: Double(g) / 255,
            blue: Double(b) / 255,
            opacity: Double(a) / 255
        )
    }
}

// Preview provider for SwiftUI canvas
struct MetroTimesWidget_Previews: PreviewProvider {
    static var previews: some View {
        MetroTimesWidgetEntryView(
            entry: DepartureEntry(
                date: Date(),
                stops: [],
                departures: [],
                configuration: ConfigurationIntent()
            )
        )
        .previewContext(WidgetPreviewContext(family: .systemMedium))
    }
} 