const express = require('express');
const path = require('path');

const app = express();
const port = process.env.PORT || 5000;

const clubData = {
  name: 'Interact Club of BDU STEM Center',
  shortName: 'Interact BDU STEM',
  location: 'Bahir Dar, Ethiopia',
  motto: 'Service Above Self',
  sponsor: 'Rotary Club of Bahir Dar, District 9212',
  about: {
    tagline: 'High school students leading with purpose and serving our community.',
    story: 'We are high school students based at the Bahir Dar University STEM Center, united by a shared commitment to service and leadership. Sponsored by the Rotary Club of Bahir Dar and part of the global Rotary International network, our club brings young people together to create meaningful community projects and make a positive difference across Bahir Dar.',
    mission: 'To empower high school students to grow as leaders, take creative initiative, and serve our local community through Service Above Self.',
    vision: 'A vibrant, student-led community where young people discover their potential, serve with empathy, and build lasting positive change in Bahir Dar.',
    metrics: [
      { val: '0', label: 'Active High School Members' },
      { val: '0', label: 'Community Service Projects' },
      { val: '0', label: 'Youth Leadership Initiatives' },
      { val: '0', label: 'Global Rotary Family' }
    ]
  },
  projects: [
    { num: '', tag: '', title: '', desc: '', tech: [], impact: '' },
    { num: '', tag: '', title: '', desc: '', tech: [], impact: '' },
    { num: '', tag: '', title: '', desc: '', tech: [], impact: '' },
    { num: '', tag: '', title: '', desc: '', tech: [], impact: '' }
  ],
  contact: {
    email: '..',
    phone: '..',
    location: 'BDU STEM Center, Main Campus, Bahir Dar, Ethiopia',
    telegram: '..',
    meetingTime: 'Saturdays from 9:00 AM to 11:30 AM at Hall B'
  }
};

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use('/static', express.static(path.join(__dirname, 'static')));

app.get('/', (req, res) => {
  res.render('index', { club: clubData });
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
