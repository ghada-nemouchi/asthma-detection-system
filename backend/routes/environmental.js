// backend/routes/environmental.js
const express = require('express');
const axios = require('axios');
const router = express.Router();

// Your Weatherbit API key
const WEATHERBIT_API_KEY = '73acb4089c4447c99eccfec1fc2e100b';

// Current environmental data endpoint
router.get('/current', async (req, res) => {
  try {
    const { lat, lon } = req.query;
    
    // Default to Sidi Amar, Annaba, Algeria if no location provided
    const latitude = lat || 36.8256;
    const longitude = lon || 7.6083;
    
    console.log(`📍 Fetching real environmental data for: ${latitude}, ${longitude}`);
    
    // Fetch current weather data from Weatherbit
    const weatherResponse = await axios.get(
      `https://api.weatherbit.io/v2.0/current`,
      {
        params: {
          lat: latitude,
          lon: longitude,
          key: WEATHERBIT_API_KEY,
          units: 'M' // Metric units
        },
        timeout: 10000
      }
    );
    
    const weatherData = weatherResponse.data.data[0];
    
    // Fetch air quality data from Weatherbit
    let aqiValue = 3; // Default moderate
    let aqiMap = {
      1: 'Good',
      2: 'Fair', 
      3: 'Moderate',
      4: 'Poor',
      5: 'Very Poor'
    };
    
    try {
      const airQualityResponse = await axios.get(
        `https://api.weatherbit.io/v2.0/airquality`,
        {
          params: {
            lat: latitude,
            lon: longitude,
            key: WEATHERBIT_API_KEY
          },
          timeout: 10000
        }
      );
      if (airQualityResponse.data.data && airQualityResponse.data.data[0]) {
        aqiValue = airQualityResponse.data.data[0].aqi || 3;
      }
    } catch (aqiError) {
      console.log('⚠️ Air quality data not available, using default');
    }
    
    // Determine pollen level based on season and temperature
    const getPollenLevel = () => {
      const month = new Date().getMonth();
      const temp = weatherData.temp;
      // Spring and early summer (March-August in Northern Hemisphere)
      if (month >= 2 && month <= 7) {
        if (temp > 20) return 'High';
        if (temp > 10) return 'Medium';
        return 'Low';
      }
      return 'Low';
    };
    
    const environmentalData = {
      temperature: Math.round(weatherData.temp),
      humidity: weatherData.rh,
      pollution: aqiValue,
      aqiLevel: aqiMap[aqiValue] || 'Moderate',
      pollenCount: getPollenLevel(),
      locationName: weatherData.city_name || 'Sidi Amar',
      country: weatherData.country_code || 'DZ',
      weatherCondition: weatherData.weather.description,
      windSpeed: weatherData.wind_spd,
      timestamp: new Date()
    };
    
    console.log(`✅ Environmental data fetched: ${environmentalData.temperature}°C, AQI: ${environmentalData.aqiLevel}, Location: ${environmentalData.locationName}`);
    res.json(environmentalData);
    
  } catch (error) {
    console.error('❌ Environmental API error:', error.message);
    
    if (error.response) {
      console.error('API Response status:', error.response.status);
      console.error('API Response data:', error.response.data);
    }
    
    // Fallback to mock data with Annaba as default
    console.log('🔄 Falling back to mock data for Annaba');
    const mockData = {
      temperature: 22,
      humidity: 65,
      pollution: 2,
      aqiLevel: 'Fair',
      pollenCount: 'Medium',
      locationName: 'Sidi Amar, Annaba',
      country: 'DZ',
      weatherCondition: 'partly cloudy',
      timestamp: new Date(),
      isMockData: true
    };
    
    res.json(mockData);
  }
});

module.exports = router;