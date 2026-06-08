import { Redirect } from 'expo-router';
import React from 'react';

// Entry point for the lock-screen widget. The widget links here
// (metrotimes://widget-entry) instead of the bare scheme so that opening it
// always performs a real navigation to the Times tab, rather than restoring
// whatever tab was last focused. It renders nothing — it just redirects to /.
export default function WidgetEntry() {
  return <Redirect href="/" />;
}
