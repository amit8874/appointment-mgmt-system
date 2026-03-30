import axios from 'axios';

const test = async () => {
  try {
    const res = await axios.get('http://localhost:5000/api/analytics/billing?period=week', {
      headers: {
        'Authorization': 'Bearer <MOCK_OR_REAL_TOKEN>',
        'X-Tenant-ID': 'test-slug'
      }
    });
    console.log('Success:', res.data);
  } catch (err) {
    console.error('Error:', err.response?.data || err.message);
  }
};

test();
