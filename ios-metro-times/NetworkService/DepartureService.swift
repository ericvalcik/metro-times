import Foundation
import Combine

class DepartureService {
    static let shared = DepartureService()
    
    private let apiKey: String = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MzQyNiwiaWF0IjoxNzQyMDQzMjIzLCJleHAiOjExNzQyMDQzMjIzLCJpc3MiOiJnb2xlbWlvIiwianRpIjoiZjUxOTVmYTItMTdhMi00ODlmLTkzZjgtOTRkYzI5ZjU1NGNhIn0.wV4lgOGAIVET6E9UnUlPXh9axjcgV_fWU74PU5u43_4" // Replace with your API key
    private let baseURL = "https://api.golemio.cz/v2/public/departureboards"
    
    private init() {}
    
    func fetchDepartures(for stopIds: [String]) async throws -> [Departure] {
        guard !stopIds.isEmpty else { return [] }
        
        let encodedStops = try JSONEncoder().encode([0: stopIds])
        guard let encodedString = String(data: encodedStops, encoding: .utf8) else {
            throw NSError(domain: "DepartureService", code: 1, userInfo: [NSLocalizedDescriptionKey: "Failed to encode stops"])
        }
        
        let urlString = "\(baseURL)?stopIds=\(encodedString.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? "")&limit=30&minutesAfter=360"
        guard let url = URL(string: urlString) else {
            throw NSError(domain: "DepartureService", code: 2, userInfo: [NSLocalizedDescriptionKey: "Invalid URL"])
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.addValue("application/json", forHTTPHeaderField: "Accept")
        request.addValue(apiKey, forHTTPHeaderField: "X-Access-Token")
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 else {
            throw NSError(domain: "DepartureService", code: 3, userInfo: [NSLocalizedDescriptionKey: "Invalid response"])
        }
        
        // The API returns an array with a single element, which is the array of departures
        let departures = try JSONDecoder().decode([Departure].self, from: data)
        return departures
    }
}

// Extension for a simple Publisher API for SwiftUI
extension DepartureService {
    func departures(for stopIds: [String]) -> AnyPublisher<[Departure], Error> {
        Future<[Departure], Error> { promise in
            Task {
                do {
                    let departures = try await self.fetchDepartures(for: stopIds)
                    promise(.success(departures))
                } catch {
                    promise(.failure(error))
                }
            }
        }
        .eraseToAnyPublisher()
    }
} 