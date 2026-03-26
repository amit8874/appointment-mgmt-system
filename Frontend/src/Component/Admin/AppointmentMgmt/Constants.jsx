import format from 'date-fns/format';
import parse from 'date-fns/parse';
import startOfWeek from 'date-fns/startOfWeek';
import getDay from 'date-fns/getDay';
import enUS from 'date-fns/locale/en-US';
import * as yup from 'yup';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { dateFnsLocalizer } from 'react-big-calendar';

// --- SETUP ---

const locales = {
  'en-US': enUS,
};

// Configure the localizer with the required date-fns functions
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }), // Start week on Monday
  getDay,
  locales,
});

// Custom styles to fix common layout issues
const customStyles = {
  height: '100%',
  minHeight: '600px',
  '& .rbc-calendar': {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
  },
  '& .rbc-time-view': {
    flex: 1,
  },
};

// Form validation schema
const appointmentSchema = yup.object().shape({
  patientName: yup.string().required('Patient name is required'),
  doctorId: yup.string().required('Please select a doctor'),
  reason: yup.string().required('Please provide a reason for visit'),
  date: yup.string().required('Date is required'),
  time: yup.string().required('Time is required'),
});

export {
  localizer,
  customStyles,
  appointmentSchema,
};
