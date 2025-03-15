import Foundation

enum Configuration {
    static let apiKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MzQyNiwiaWF0IjoxNzQyMDQzMjIzLCJleHAiOjExNzQyMDQzMjIzLCJpc3MiOiJnb2xlbWlvIiwianRpIjoiZjUxOTVmYTItMTdhMi00ODlmLTkzZjgtOTRkYzI5ZjU1NGNhIn0.wV4lgOGAIVET6E9UnUlPXh9axjcgV_fWU74PU5u43_4" // Add your API key here
    
    static let widgetRefreshInterval: TimeInterval = 15 * 60 // 15 minutes in seconds
    static let widgetMaxStopsToDisplay = 3 // Maximum number of stops to display in widget
    static let maxDeparturesPerStop = 2 // Maximum number of departures to display per stop
    
    // Network request settings
    static let requestTimeoutInterval: TimeInterval = 30
    static let requestCachePolicy: URLRequest.CachePolicy = .reloadIgnoringLocalCacheData
} 