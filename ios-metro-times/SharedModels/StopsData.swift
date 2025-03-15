import Foundation

// This file would contain the stops data from the web app
// For a complete implementation, you would need to convert the stops data from the web app to Swift

struct StopsData {
    // Sample stops data - in a real implementation, this would be loaded from a JSON file
    // or fetched from an API
    static let allStops: [Stop] = [
        Stop(
            name: "Bořislavka",
            type: .metroA,
            stops: ["U157Z101P", "U157Z102P"],
            lat: 50.098341000000005,
            lon: 14.362833
        ),
        Stop(
            name: "Dejvická",
            type: .metroA,
            stops: ["U321Z101P", "U321Z102P"],
            lat: 50.10047195,
            lon: 14.3931756
        ),
        Stop(
            name: "Můstek",
            type: .metroA,
            stops: ["U1072Z101P", "U1072Z102P"],
            lat: 50.083531199999996,
            lon: 14.424557700000001
        ),
        Stop(
            name: "Staroměstská",
            type: .metroA,
            stops: ["U703Z101P", "U703Z102P"],
            lat: 50.0882026,
            lon: 14.4176717
        ),
        Stop(
            name: "Anděl",
            type: .metroB,
            stops: ["U1040Z101P", "U1040Z102P"],
            lat: 50.06995,
            lon: 14.403769
        ),
        Stop(
            name: "Florenc",
            type: .metroB,
            stops: ["U689Z101P", "U689Z102P"],
            lat: 50.0904825,
            lon: 14.437647349999999
        ),
        Stop(
            name: "Karlovo náměstí",
            type: .metroB,
            stops: ["U237Z101P", "U237Z102P"],
            lat: 50.0745907,
            lon: 14.416979
        ),
        Stop(
            name: "Florenc",
            type: .metroC,
            stops: ["U689Z121P", "U689Z122P"],
            lat: 50.0904825,
            lon: 14.437647349999999
        ),
        Stop(
            name: "Hlavní nádraží",
            type: .metroC,
            stops: ["U175Z101P", "U175Z102P"],
            lat: 50.0835494,
            lon: 14.4341456
        ),
        Stop(
            name: "Muzeum",
            type: .metroC,
            stops: ["U400Z121P", "U400Z122P"],
            lat: 50.07948305,
            lon: 14.431670350000001
        )
    ]
    
    // Function to load all stops from a JSON file
    static func loadStops() -> [Stop] {
        // In a real implementation, this would load the stops from a JSON file
        // For now, we'll just return the sample data
        return allStops
    }
} 