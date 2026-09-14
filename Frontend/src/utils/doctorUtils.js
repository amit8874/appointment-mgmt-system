export const MALE_DOCTOR_DEFAULT_IMAGE = "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&q=80&w=300&h=300";
export const FEMALE_DOCTOR_DEFAULT_IMAGE = "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=300&h=300";

/**
 * Checks if doctor attributes, gender, title, or name indicate a female doctor
 * @param {Object} doctor Doctor object
 * @returns {boolean}
 */
export const isFemaleDoctor = (doctor) => {
  if (!doctor) return false;

  const gender = (doctor.gender || '').toLowerCase().trim();
  if (gender === 'female' || gender === 'f' || gender === 'woman' || gender === 'women') {
    return true;
  }
  if (gender === 'male' || gender === 'm' || gender === 'man' || gender === 'men') {
    return false;
  }

  const name = (doctor.name || doctor.firstName || doctor.fullName || '').toLowerCase().trim();
  const designation = (doctor.designation || '').toLowerCase().trim();
  const qualification = (doctor.qualification || '').toLowerCase().trim();
  const specialization = (doctor.specialization || doctor.department || '').toLowerCase().trim();
  const fullText = `${name} ${designation} ${qualification} ${specialization}`;

  const femalePatterns = [
    /\bmrs\b/i,
    /\bms\b/i,
    /\bmiss\b/i,
    /\bsmt\b/i,
    /\bfemale\b/i,
    /\bwomen\b/i,
    /\bwoman\b/i,
    /\bgynaecologist\b/i,
    /\bgynecologist\b/i,
    /\bgynecology\b/i,
    /\bobstetrician\b/i,
    /\b(vandana|anita|sunita|pooja|priya|neha|swati|shweta|meena|seema|reena|rekha|archana|sita|geeta|rita|nisha|divya|monika|renu|sarita|sangita|radha|laxmi|deepa|deepika|preeti|priti|aarti|arti|alisha|anusha|ananya|aditi|ishita|sneha|tanvi|richa|khushboo|payal|kajal|sonam|bhavna|rashmi|shruthi|shruti|priyanka|roshni|smita|sonia|suman|sushma|upasana|vidya|kamla|bimla|pushpa|radhika|saroj|savita|shashi|sumitra|urmila|vimla|babita|chhaya|dolly|hema|jyoti|kavita|lata|mamta|nirmala|poonam|rajni|rubi|ruby|sangeeta|sharda|sheela|sudha|uma|yashoda|alicia|amanda|amy|angela|ann|anna|anne|ashley|barbara|betty|beverly|brenda|carol|carolyn|catherine|cheryl|christina|christine|cynthia|deborah|debra|denise|diana|diane|donna|dorothy|elizabeth|emily|emma|evelyn|frances|gail|gloria|grace|hannah|heather|helen|irene|jacqueline|jane|janet|janice|jean|jennifer|jessica|joan|joyce|judith|judy|julia|julie|karen|katherine|kathleen|kathryn|kay|kelly|kimberly|laura|lauren|linda|lisa|lori|louise|margaret|maria|marie|marilyn|martha|mary|megan|melissa|michelle|nancy|nicole|pamela|patricia|paula|peggy|rachel|rebecca|rhonda|rose|ruth|sandra|sarah|sharon|shirley|stephanie|susan|theresa|tracy|virginia|wanda|wendy|yvonne)\b/i
  ];

  return femalePatterns.some(pattern => pattern.test(fullText));
};

/**
 * Returns doctor photo or default fallback image based on gender/title/name
 * @param {Object} doctor Doctor object
 * @returns {string} Image URL
 */
export const getDoctorPhoto = (doctor) => {
  if (!doctor) return MALE_DOCTOR_DEFAULT_IMAGE;

  const female = isFemaleDoctor(doctor);
  const photo = doctor.photo || doctor.profilePhoto;

  // If a photo exists, check if it's a default male/female image placeholder
  if (photo && typeof photo === 'string' && photo.trim() !== '') {
    const isMaleDefault = photo.includes('photo-1612349317150-e413f6a5b16d') || photo.includes('male_doctor');
    const isFemaleDefault = photo.includes('photo-1559839734-2b71ea197ec2') || photo.includes('female_doctor');

    if (female) {
      if (isMaleDefault) return FEMALE_DOCTOR_DEFAULT_IMAGE;
      return photo;
    } else {
      if (isFemaleDefault) return MALE_DOCTOR_DEFAULT_IMAGE;
      return photo;
    }
  }

  return female ? FEMALE_DOCTOR_DEFAULT_IMAGE : MALE_DOCTOR_DEFAULT_IMAGE;
};

