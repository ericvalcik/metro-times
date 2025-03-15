import Foundation

// Main Departure model to match the API response
struct Departure: Codable, Identifiable {
    var id: String { trip.id }
    var departure: DepartureInfo
    var route: RouteInfo
    var stop: StopInfo
    var trip: TripInfo
    var vehicle: VehicleInfo
    
    // Computed property to parse departure information
    var parsedDeparture: (predicted: Date, direction: String) {
        (predicted: ISO8601DateFormatter().date(from: departure.timestamp_predicted) ?? Date(),
         direction: trip.headsign)
    }
    
    // Computed property to get seconds left until departure
    func secondsLeft(currentTime: Date) -> Int {
        let predicted = parsedDeparture.predicted
        return Int(round((predicted.timeIntervalSince1970 - currentTime.timeIntervalSince1970)))
    }
    
    // Format remaining time as a string
    func formattedTimeRemaining(currentTime: Date) -> String {
        let seconds = secondsLeft(currentTime: currentTime)
        
        if seconds < 0 {
            return "Departed"
        }
        
        let minutes = Int(seconds / 60)
        let remainingSeconds = Int(seconds % 60)
        return "\(minutes):\(String(format: "%02d", remainingSeconds))"
    }
}

// Nested structures matching the API response
struct DepartureInfo: Codable {
    var delay_seconds: Int
    var minutes: Int
    var timestamp_predicted: String
    var timestamp_scheduled: String
}

struct RouteInfo: Codable {
    var type: String
    var short_name: String
}

struct StopInfo: Codable {
    var id: String
    var platform_code: String
    var sequence: Int
}

struct TripInfo: Codable {
    var headsign: String
    var id: String
    var is_cancelled: Bool
}

struct VehicleInfo: Codable {
    var has_charger: Bool?
    var id: String
    var is_air_conditioned: Bool?
    var is_wheelchair_accessible: Bool?
} 