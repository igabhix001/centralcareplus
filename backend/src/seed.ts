import 'dotenv/config';
import bcrypt from 'bcryptjs';
import prisma from './lib/prisma.js';

async function seed() {
  console.log('🌱 Seeding database with Indian data...');

  // Clear existing data
  await prisma.googleFitData.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.attachment.deleteMany();
  await prisma.prescription.deleteMany();
  await prisma.medicalRecord.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.patient.deleteMany();
  await prisma.doctor.deleteMany();
  await prisma.user.deleteMany();

  const hashedPassword = await bcrypt.hash('password123', 12);

  // Create Admin
  const admin = await prisma.user.create({
    data: {
      email: 'admin@centralcare.com',
      password: hashedPassword,
      firstName: 'Rajesh',
      lastName: 'Sharma',
      role: 'SUPERADMIN',
      phone: '+91 98765 43210',
    },
  });
  console.log('✅ Created admin:', admin.email);

  // Create Staff
  const staff = await prisma.user.create({
    data: {
      email: 'staff@centralcare.com',
      password: hashedPassword,
      firstName: 'Priya',
      lastName: 'Verma',
      role: 'STAFF',
      phone: '+91 98765 43211',
    },
  });
  console.log('✅ Created staff:', staff.email);

  // Create Doctors with Indian names
  const doctorsData = [
    {
      email: 'doctor@centralcare.com',
      firstName: 'Amit',
      lastName: 'Patel',
      phone: '+91 98765 11111',
      specialization: 'Cardiology',
      licenseNumber: 'MCI-2010-12345',
      experience: 15,
      consultationFee: 1500,
      bio: 'Senior Cardiologist with 15+ years of experience at AIIMS Delhi. Specializes in interventional cardiology and heart failure management.',
      education: ['MBBS - AIIMS Delhi', 'MD Cardiology - AIIMS Delhi', 'DM Cardiology - PGI Chandigarh'],
      languages: ['Hindi', 'English', 'Gujarati'],
    },
    {
      email: 'sunita.sharma@centralcare.com',
      firstName: 'Sunita',
      lastName: 'Sharma',
      phone: '+91 98765 22222',
      specialization: 'Neurology',
      licenseNumber: 'MCI-2012-23456',
      experience: 12,
      consultationFee: 1800,
      bio: 'Neurologist specializing in stroke management, epilepsy, and movement disorders. Former consultant at Fortis Hospital.',
      education: ['MBBS - Maulana Azad Medical College', 'MD Medicine - LHMC Delhi', 'DM Neurology - NIMHANS Bangalore'],
      languages: ['Hindi', 'English'],
    },
    {
      email: 'vikram.singh@centralcare.com',
      firstName: 'Vikram',
      lastName: 'Singh',
      phone: '+91 98765 33333',
      specialization: 'Orthopedics',
      licenseNumber: 'MCI-2014-34567',
      experience: 10,
      consultationFee: 1200,
      bio: 'Orthopedic surgeon specializing in joint replacement and sports medicine. Expert in arthroscopic surgeries.',
      education: ['MBBS - Armed Forces Medical College Pune', 'MS Orthopedics - CMC Vellore'],
      languages: ['Hindi', 'English', 'Punjabi'],
    },
    {
      email: 'meera.iyer@centralcare.com',
      firstName: 'Meera',
      lastName: 'Iyer',
      phone: '+91 98765 44444',
      specialization: 'Pediatrics',
      licenseNumber: 'MCI-2015-45678',
      experience: 8,
      consultationFee: 1000,
      bio: 'Pediatrician with expertise in neonatal care and childhood vaccinations. Consultant at Apollo Children Hospital.',
      education: ['MBBS - Kasturba Medical College', 'MD Pediatrics - KEM Hospital Mumbai'],
      languages: ['Hindi', 'English', 'Tamil', 'Malayalam'],
    },
    {
      email: 'arjun.reddy@centralcare.com',
      firstName: 'Arjun',
      lastName: 'Reddy',
      phone: '+91 98765 55555',
      specialization: 'Dermatology',
      licenseNumber: 'MCI-2016-56789',
      experience: 7,
      consultationFee: 800,
      bio: 'Dermatologist specializing in cosmetic dermatology, skin allergies, and laser treatments.',
      education: ['MBBS - Osmania Medical College', 'MD Dermatology - JIPMER Puducherry'],
      languages: ['Hindi', 'English', 'Telugu'],
    },
    {
      email: 'kavitha.nair@centralcare.com',
      firstName: 'Kavitha',
      lastName: 'Nair',
      phone: '+91 98765 66666',
      specialization: 'Gynecology',
      licenseNumber: 'MCI-2011-67890',
      experience: 14,
      consultationFee: 1400,
      bio: 'Senior Gynecologist with expertise in high-risk pregnancies and laparoscopic surgeries.',
      education: ['MBBS - Government Medical College Trivandrum', 'MD OBG - JIPMER', 'Fellowship in Reproductive Medicine'],
      languages: ['Hindi', 'English', 'Malayalam'],
    },
  ];

  const doctors = [];
  for (const doc of doctorsData) {
    const user = await prisma.user.create({
      data: {
        email: doc.email,
        password: hashedPassword,
        firstName: doc.firstName,
        lastName: doc.lastName,
        phone: doc.phone,
        role: 'DOCTOR',
        doctor: {
          create: {
            specialization: doc.specialization,
            licenseNumber: doc.licenseNumber,
            experience: doc.experience,
            consultationFee: doc.consultationFee,
            bio: doc.bio,
            education: doc.education,
            languages: doc.languages,
            availableDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
            availableFrom: '09:00',
            availableTo: '18:00',
            slotDuration: 30,
            rating: 4.5 + Math.random() * 0.5,
            reviewCount: Math.floor(Math.random() * 200) + 50,
          },
        },
      },
      include: { doctor: true },
    });
    doctors.push(user);
    console.log('✅ Created doctor:', user.email);
  }

  // Create Patients with Indian names
  const patientsData = [
    {
      email: 'patient@centralcare.com',
      firstName: 'Ananya',
      lastName: 'Gupta',
      phone: '+91 99887 11111',
      dateOfBirth: new Date('1990-05-15'),
      gender: 'FEMALE' as const,
      bloodGroup: 'B+',
      address: '42, Vasant Kunj, New Delhi - 110070',
      emergencyContact: 'Rohit Gupta',
      emergencyPhone: '+91 99887 11112',
    },
    {
      email: 'rahul.kumar@centralcare.com',
      firstName: 'Rahul',
      lastName: 'Kumar',
      phone: '+91 99887 22222',
      dateOfBirth: new Date('1985-08-22'),
      gender: 'MALE' as const,
      bloodGroup: 'O+',
      address: '15, Koramangala, Bangalore - 560034',
      emergencyContact: 'Sneha Kumar',
      emergencyPhone: '+91 99887 22223',
    },
    {
      email: 'priyanka.das@centralcare.com',
      firstName: 'Priyanka',
      lastName: 'Das',
      phone: '+91 99887 33333',
      dateOfBirth: new Date('1975-03-10'),
      gender: 'FEMALE' as const,
      bloodGroup: 'A+',
      address: '78, Salt Lake City, Kolkata - 700091',
      emergencyContact: 'Amit Das',
      emergencyPhone: '+91 99887 33334',
    },
    {
      email: 'vijay.menon@centralcare.com',
      firstName: 'Vijay',
      lastName: 'Menon',
      phone: '+91 99887 44444',
      dateOfBirth: new Date('1988-11-25'),
      gender: 'MALE' as const,
      bloodGroup: 'AB+',
      address: '23, Bandra West, Mumbai - 400050',
      emergencyContact: 'Lakshmi Menon',
      emergencyPhone: '+91 99887 44445',
    },
    {
      email: 'deepa.krishnan@centralcare.com',
      firstName: 'Deepa',
      lastName: 'Krishnan',
      phone: '+91 99887 55555',
      dateOfBirth: new Date('1992-07-18'),
      gender: 'FEMALE' as const,
      bloodGroup: 'O-',
      address: '56, Anna Nagar, Chennai - 600040',
      emergencyContact: 'Suresh Krishnan',
      emergencyPhone: '+91 99887 55556',
    },
  ];

  const patients = [];
  for (const pat of patientsData) {
    const user = await prisma.user.create({
      data: {
        email: pat.email,
        password: hashedPassword,
        firstName: pat.firstName,
        lastName: pat.lastName,
        phone: pat.phone,
        role: 'PATIENT',
        patient: {
          create: {
            dateOfBirth: pat.dateOfBirth,
            gender: pat.gender,
            bloodGroup: pat.bloodGroup,
            address: pat.address,
            emergencyContact: pat.emergencyContact,
            emergencyPhone: pat.emergencyPhone,
            googleFitConnected: pat.email === 'patient@centralcare.com',
          },
        },
      },
      include: { patient: true },
    });
    patients.push(user);
    console.log('✅ Created patient:', user.email);
  }

  // Create Appointments
  const now = new Date();
  const appointmentsData = [
    {
      patientId: patients[0].patient!.id,
      doctorId: doctors[0].doctor!.id,
      scheduledAt: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000),
      duration: 30,
      type: 'checkup',
      status: 'CONFIRMED' as const,
      notes: 'Regular cardiac checkup',
    },
    {
      patientId: patients[0].patient!.id,
      doctorId: doctors[1].doctor!.id,
      scheduledAt: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000),
      duration: 30,
      type: 'consultation',
      status: 'SCHEDULED' as const,
      notes: 'Headache consultation',
    },
    {
      patientId: patients[1].patient!.id,
      doctorId: doctors[0].doctor!.id,
      scheduledAt: new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000),
      duration: 30,
      type: 'followup',
      status: 'CONFIRMED' as const,
      notes: 'Post-procedure follow-up',
    },
    {
      patientId: patients[2].patient!.id,
      doctorId: doctors[3].doctor!.id,
      scheduledAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
      duration: 30,
      type: 'checkup',
      status: 'COMPLETED' as const,
      notes: 'Completed checkup',
    },
    {
      patientId: patients[0].patient!.id,
      doctorId: doctors[2].doctor!.id,
      scheduledAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
      duration: 30,
      type: 'consultation',
      status: 'COMPLETED' as const,
      notes: 'Knee pain consultation',
    },
  ];

  const createdAppointments = [];
  for (const apt of appointmentsData) {
    const appointment = await prisma.appointment.create({ data: apt });
    createdAppointments.push(appointment);
  }
  console.log('✅ Created appointments');

  // Create Medical Records for completed appointments
  const medicalRecordsData = [
    {
      patientId: patients[2].patient!.id,
      doctorId: doctors[3].doctor!.id,
      appointmentId: createdAppointments[3].id,
      diagnosis: 'Seasonal Flu',
      symptoms: ['Fever', 'Body ache', 'Runny nose', 'Fatigue'],
      notes: 'Patient presented with flu-like symptoms for 3 days. Advised rest and hydration.',
      vitals: {
        bloodPressure: '120/80',
        heartRate: 78,
        temperature: 100.4,
        weight: 65,
        oxygenLevel: 97,
      },
    },
    {
      patientId: patients[0].patient!.id,
      doctorId: doctors[2].doctor!.id,
      appointmentId: createdAppointments[4].id,
      diagnosis: 'Mild Osteoarthritis - Left Knee',
      symptoms: ['Knee pain', 'Stiffness', 'Swelling'],
      notes: 'X-ray shows early signs of osteoarthritis. Recommended physiotherapy and weight management.',
      vitals: {
        bloodPressure: '118/75',
        heartRate: 72,
        temperature: 98.6,
        weight: 58,
        oxygenLevel: 99,
      },
    },
  ];

  const createdRecords = [];
  for (const record of medicalRecordsData) {
    const created = await prisma.medicalRecord.create({ data: record });
    createdRecords.push(created);
  }
  console.log('✅ Created medical records');

  // Create Prescriptions
  const prescriptionsData = [
    {
      patientId: patients[2].patient!.id,
      doctorId: doctors[3].doctor!.id,
      recordId: createdRecords[0].id,
      medications: [
        { name: 'Paracetamol 500mg', dosage: '1 tablet', frequency: 'Three times daily', duration: '5 days', notes: 'After meals' },
        { name: 'Cetirizine 10mg', dosage: '1 tablet', frequency: 'Once daily', duration: '5 days', notes: 'At bedtime' },
        { name: 'Vitamin C 500mg', dosage: '1 tablet', frequency: 'Once daily', duration: '10 days', notes: 'After breakfast' },
      ],
      instructions: 'Take plenty of fluids. Rest for 3-4 days. Avoid cold drinks and ice cream.',
      validUntil: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
    },
    {
      patientId: patients[0].patient!.id,
      doctorId: doctors[2].doctor!.id,
      recordId: createdRecords[1].id,
      medications: [
        { name: 'Diclofenac 50mg', dosage: '1 tablet', frequency: 'Twice daily', duration: '7 days', notes: 'After meals' },
        { name: 'Calcium + Vitamin D3', dosage: '1 tablet', frequency: 'Once daily', duration: '30 days', notes: 'After dinner' },
        { name: 'Glucosamine Sulfate 500mg', dosage: '1 capsule', frequency: 'Twice daily', duration: '30 days', notes: 'With meals' },
      ],
      instructions: 'Apply hot compress on knee. Do prescribed exercises. Avoid stairs if possible.',
      validUntil: new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000),
    },
  ];

  for (const prescription of prescriptionsData) {
    await prisma.prescription.create({ data: prescription });
  }
  console.log('✅ Created prescriptions');

  // Create Audit Logs
  await prisma.auditLog.create({
    data: { userId: admin.id, action: 'LOGIN', entity: 'User', entityId: admin.id, details: JSON.stringify({ ip: '192.168.1.1' }) }
  });
  await prisma.auditLog.create({
    data: { userId: doctors[0].id, action: 'CREATE', entity: 'MedicalRecord', entityId: createdRecords[0].id, details: JSON.stringify({ patientName: 'Priyanka Das' }) }
  });
  await prisma.auditLog.create({
    data: { userId: doctors[2].id, action: 'CREATE', entity: 'Prescription', entityId: createdRecords[1].id, details: JSON.stringify({ patientName: 'Ananya Gupta' }) }
  });
  console.log('✅ Created audit logs');

  // Create Google Fit data for first patient
  const fitPatient = patients[0].patient!;
  for (let i = 0; i < 7; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0);

    await prisma.googleFitData.create({
      data: {
        patientId: fitPatient.id,
        date,
        steps: 5000 + Math.floor(Math.random() * 8000),
        heartRate: 60 + Math.floor(Math.random() * 30),
        calories: 1500 + Math.floor(Math.random() * 1000),
        sleepHours: 5 + Math.random() * 4,
        distance: 3000 + Math.floor(Math.random() * 7000),
      },
    });
  }
  console.log('✅ Created Google Fit data');

  console.log('\n🎉 Seeding complete!\n');
  console.log('Demo Credentials (Indian Users):');
  console.log('─────────────────────────────────────');
  console.log('Admin:   admin@centralcare.com / password123 (Rajesh Sharma)');
  console.log('Staff:   staff@centralcare.com / password123 (Priya Verma)');
  console.log('Doctor:  doctor@centralcare.com / password123 (Dr. Amit Patel)');
  console.log('Patient: patient@centralcare.com / password123 (Ananya Gupta)');
  console.log('─────────────────────────────────────\n');
}

seed()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
