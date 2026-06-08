import { Redirect } from 'expo-router';
import React from 'react';

// Any unmatched deep link (e.g. the lock-screen widget's `metrotimes:///`, which
// parses to an empty host + a path expo-router doesn't match) falls through to
// here. Redirect to the departures index so the widget tap always lands home.
export default function NotFound() {
  return <Redirect href="/" />;
}
