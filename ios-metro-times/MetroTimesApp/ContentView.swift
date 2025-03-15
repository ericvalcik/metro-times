import SwiftUI
import Combine

struct ContentView: View {
    @StateObject private var viewModel = DeparturesViewModel()
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 16) {
                    if viewModel.isLoading {
                        ProgressView("Loading departures...")
                            .padding()
                    } else if viewModel.error != nil {
                        ErrorView(error: viewModel.error!, retry: viewModel.loadData)
                    } else if viewModel.nearbyStops.isEmpty {
                        Text("No nearby stops found")
                            .padding()
                    } else {
                        ForEach(viewModel.nearbyStops) { stop in
                            StopDepartureCard(
                                stop: stop,
                                allDepartures: viewModel.departures,
                                currentTime: viewModel.currentTime
                            )
                        }
                    }
                }
                .padding()
            }
            .navigationTitle("Metro Times")
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(action: viewModel.loadData) {
                        Image(systemName: "arrow.clockwise")
                    }
                }
            }
        }
        .onAppear {
            viewModel.loadData()
        }
    }
}

// Error view
struct ErrorView: View {
    let error: Error
    let retry: () -> Void
    
    var body: some View {
        VStack(spacing: 16) {
            Text("Error loading departures")
                .font(.headline)
            
            Text(error.localizedDescription)
                .font(.subheadline)
                .multilineTextAlignment(.center)
            
            Button("Retry", action: retry)
                .buttonStyle(.borderedProminent)
        }
        .padding()
        .background(Color(.secondarySystemBackground))
        .cornerRadius(12)
        .padding()
    }
}

// Stop departure card
struct StopDepartureCard: View {
    let stop: Stop
    let allDepartures: [Departure]
    let currentTime: Date
    
    // Filter departures for this stop
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
        
        return uniqueDepartures
    }
    
    var body: some View {
        if !stopDepartures.isEmpty {
            VStack(alignment: .leading, spacing: 12) {
                // Stop header
                HStack {
                    // Metro icon with type color
                    Circle()
                        .fill(Color(hex: stop.type.color))
                        .frame(width: 16, height: 16)
                    
                    // Stop name and type
                    VStack(alignment: .leading) {
                        Text(stop.name)
                            .font(.headline)
                            .foregroundColor(.white)
                        
                        Text(stop.type.displayName)
                            .font(.caption)
                            .foregroundColor(Color(hex: stop.type.color))
                    }
                    
                    Spacer()
                    
                    // Distance (optional)
                    if let distance = stop.distance {
                        Text(formatDistance(distance))
                            .font(.caption)
                            .foregroundColor(.gray)
                    }
                }
                
                Divider()
                    .background(Color.gray.opacity(0.5))
                
                // Departures
                ForEach(stopDepartures) { departure in
                    DepartureRow(
                        departure: departure,
                        currentTime: currentTime
                    )
                }
            }
            .padding()
            .background(Color(hex: "#131313"))
            .cornerRadius(16)
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
struct DepartureRow: View {
    let departure: Departure
    let currentTime: Date
    
    var body: some View {
        HStack {
            // Direction/Headsign
            Text(departure.parsedDeparture.direction)
                .font(.body)
                .foregroundColor(.white)
            
            Spacer()
            
            // Time remaining
            Text(departure.formattedTimeRemaining(currentTime: currentTime))
                .font(.body)
                .foregroundColor(.white)
        }
        .padding(.vertical, 4)
    }
}

// ViewModel for the departures view
class DeparturesViewModel: ObservableObject {
    @Published var nearbyStops: [Stop] = []
    @Published var departures: [Departure] = []
    @Published var currentTime = Date()
    @Published var isLoading = false
    @Published var error: Error?
    
    private var cancellables = Set<AnyCancellable>()
    private let locationManager = LocationManager.shared
    private let timer = Timer.publish(every: 1, on: .main, in: .common).autoconnect()
    
    init() {
        // Update current time every second
        timer
            .sink { [weak self] date in
                self?.currentTime = date
            }
            .store(in: &cancellables)
        
        // Request location permission
        locationManager.requestPermission()
    }
    
    func loadData() {
        isLoading = true
        error = nil
        
        // Load stops data from StopsData
        let allStops = StopsData.loadStops()
        
        // Find nearby stops based on location
        nearbyStops = locationManager.findNearbyStops(allStops: allStops)
        
        // Get stop IDs for API request
        let stopIds = nearbyStops.flatMap { $0.stops }
        
        // Fetch departures
        DepartureService.shared.departures(for: stopIds)
            .receive(on: DispatchQueue.main)
            .sink(
                receiveCompletion: { [weak self] completion in
                    self?.isLoading = false
                    
                    if case .failure(let error) = completion {
                        self?.error = error
                    }
                },
                receiveValue: { [weak self] departures in
                    self?.departures = departures
                }
            )
            .store(in: &cancellables)
    }
}

// Helper extension to create Color from hex string (same as in widget)
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

struct ContentView_Previews: PreviewProvider {
    static var previews: some View {
        ContentView()
    }
} 