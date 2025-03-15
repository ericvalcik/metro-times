import Foundation
import CoreLocation
import Combine

class LocationManager: NSObject, ObservableObject {
    private let locationManager = CLLocationManager()
    
    @Published var location: CLLocation?
    @Published var authorizationStatus: CLAuthorizationStatus
    
    static let shared = LocationManager()
    
    override init() {
        self.authorizationStatus = .notDetermined
        
        super.init()
        
        self.locationManager.delegate = self
        self.locationManager.desiredAccuracy = kCLLocationAccuracyHundredMeters
        self.locationManager.distanceFilter = 100 // Update location every 100 meters
        self.authorizationStatus = locationManager.authorizationStatus
    }
    
    func requestPermission() {
        locationManager.requestWhenInUseAuthorization()
    }
    
    func startUpdatingLocation() {
        locationManager.startUpdatingLocation()
    }
    
    func stopUpdatingLocation() {
        locationManager.stopUpdatingLocation()
    }
    
    // Find nearby stops based on current location
    func findNearbyStops(allStops: [Stop], limit: Int = 5) -> [Stop] {
        guard let currentLocation = location else { return [] }
        
        let currentCoordinate = currentLocation.coordinate
        
        return allStops.map { stop in
            var stopWithDistance = stop
            stopWithDistance.distance = calculateDistance(
                from: currentCoordinate,
                to: CLLocationCoordinate2D(latitude: stop.lat, longitude: stop.lon)
            )
            return stopWithDistance
        }
        .sorted { $0.distance ?? Double.infinity < $1.distance ?? Double.infinity }
        .prefix(limit)
        .map { $0 }
    }
}

// MARK: - CLLocationManagerDelegate
extension LocationManager: CLLocationManagerDelegate {
    func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        authorizationStatus = manager.authorizationStatus
        
        if manager.authorizationStatus == .authorizedWhenInUse ||
           manager.authorizationStatus == .authorizedAlways {
            locationManager.startUpdatingLocation()
        }
    }
    
    func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        guard let location = locations.last else { return }
        self.location = location
    }
    
    func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        print("Location manager failed with error: \(error.localizedDescription)")
        
        #if DEBUG
        // For debugging - set a default location
        self.location = CLLocation(latitude: 50.07777384729586, longitude: 14.417414782736316)
        #endif
    }
} 