import Foundation
import CoreLocation

enum MetroType: String, Codable {
    case metroA = "metroA"
    case metroB = "metroB" 
    case metroC = "metroC"
}

struct Stop: Identifiable, Codable {
    var id: String { name }
    var name: String
    var type: MetroType
    var stops: [String]
    var lat: Double
    var lon: Double
    var distance: Double?
    
    var coordinate: CLLocationCoordinate2D {
        CLLocationCoordinate2D(latitude: lat, longitude: lon)
    }
}

extension MetroType {
    var color: String {
        switch self {
        case .metroA: return "#50AF32"
        case .metroB: return "#FFD500"
        case .metroC: return "#E63024"
        }
    }
    
    var displayName: String {
        switch self {
        case .metroA: return "Metro A"
        case .metroB: return "Metro B"
        case .metroC: return "Metro C"
        }
    }
}

// Helper function to calculate distance between coordinates
func calculateDistance(from: CLLocationCoordinate2D, to: CLLocationCoordinate2D) -> CLLocationDistance {
    let fromLocation = CLLocation(latitude: from.latitude, longitude: from.longitude)
    let toLocation = CLLocation(latitude: to.latitude, longitude: to.longitude)
    return fromLocation.distance(from: toLocation)
} 