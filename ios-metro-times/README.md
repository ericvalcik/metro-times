# Metro Times iOS App

This is an iOS port of the Metro Times web app. The main focus is on providing a widget that displays metro departure information.

## Features

- iOS app with the same functionality as the web app
- Home screen widget showing nearby metro departure times
- Location-based stop recommendations
- Real-time departure updates

## Implementation Details

The app is implemented using Swift and SwiftUI, with WidgetKit for the widget implementation. The widget mimics the `StopDepartureGroup` component from the web app.

## Project Structure

- **MetroTimesApp**: Main iOS app
- **MetroTimesWidget**: Widget extension for displaying departures
- **SharedModels**: Shared data models between app and widget
- **NetworkService**: API service for fetching departure data

## Setup

1. Open the project in Xcode
2. Add your API key in the Configuration.swift file
3. Build and run
