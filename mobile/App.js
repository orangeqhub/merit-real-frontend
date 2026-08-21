import React, { useRef, useState, useEffect } from 'react';
import {
  StyleSheet,
  SafeAreaView,
  StatusBar,
  BackHandler,
  Platform,
  Linking,
  ActivityIndicator,
  View
} from 'react-native';
import { WebView } from 'react-native-webview';

const APP_URL = 'https://meritrealsolutions.in';

export default function App() {
  const webViewRef = useRef(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [loading, setLoading] = useState(true);

  // Handle Android hardware back button
  useEffect(() => {
    const handleBackPress = () => {
      if (canGoBack && webViewRef.current) {
        webViewRef.current.goBack();
        return true; // Intercept & handle
      }
      return false; // Exit app
    };

    if (Platform.OS === 'android') {
      BackHandler.addEventListener('hardwareBackPress', handleBackPress);
    }

    return () => {
      if (Platform.OS === 'android') {
        BackHandler.removeEventListener('hardwareBackPress', handleBackPress);
      }
    };
  }, [canGoBack]);

  // Handle URL requests (external vs internal schemes)
  const handleShouldStartLoad = (request) => {
    const { url } = request;

    // Detect non-http/https schemes (like tel:, mailto:, sms:, geo:, intent:)
    const isExternalScheme = !url.startsWith('http://') && !url.startsWith('https://');
    
    // Detect WhatsApp api links
    const isWhatsApp = url.startsWith('https://wa.me/') || 
                       url.startsWith('https://api.whatsapp.com/') || 
                       url.includes('whatsapp.com');

    // Detect Google Maps links to open in external maps app/browser
    const isGoogleMaps = url.includes('google.com/maps') || 
                         url.includes('maps.google.com') || 
                         url.includes('maps.app.goo.gl');

    if (isExternalScheme || isWhatsApp || isGoogleMaps) {
      Linking.openURL(url).catch((err) => {
        console.warn('Failed to open URL: ' + url, err);
      });
      return false; // Block loading in WebView
    }

    // Keep normal meritrealsolutions.in links (and localhost/dev IPs) inside WebView
    const isInternalHost = url.includes('meritrealsolutions.in') || 
                           url.includes('localhost') || 
                           url.includes('127.0.0.1') || 
                           url.includes('187.127.163.100');

    if (!isInternalHost) {
      // External links like social media or external references open in system browser
      Linking.openURL(url).catch((err) => {
        console.warn('Failed to open external web link: ' + url, err);
      });
      return false;
    }

    return true; // Load inside WebView
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#0F2A4A" barStyle="light-content" />
      <WebView
        ref={webViewRef}
        source={{ uri: APP_URL }}
        style={styles.webview}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        geolocationEnabled={true}
        allowFileAccess={true}
        allowUniversalAccessFromFileURLs={true}
        originWhitelist={['*']}
        onNavigationStateChange={(navState) => {
          setCanGoBack(navState.canGoBack);
        }}
        onShouldStartLoadWithRequest={handleShouldStartLoad}
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => setLoading(false)}
      />
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0F2A4A" />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F2A4A',
  },
  webview: {
    flex: 1,
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
