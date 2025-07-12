const { sequelize } = require('./config/database');
const { Zone, Member, Event, Payment } = require('./models');
const bcrypt = require('bcryptjs');

async function seedDatabase() {
  try {
    console.log('Starting database seeding...');

    // Create zones
    console.log('Creating zones...');
    const zones = await Zone.bulkCreate([
      { name: 'North Zone', description: 'Northern region of the city' },
      { name: 'South Zone', description: 'Southern region of the city' },
      { name: 'East Zone', description: 'Eastern region of the city' },
      { name: 'West Zone', description: 'Western region of the city' },
      { name: 'Central Zone', description: 'Central business district' }
    ]);

    console.log(`Created ${zones.length} zones`);

    // Create sample members
    console.log('Creating sample members...');
    const hashedPassword = await bcrypt.hash('password123', 10);
    
    const members = await Member.bulkCreate([
      {
        member_id: 'MEM1001',
        first_name: 'John',
        last_name: 'Doe',
        email: 'john.doe@example.com',
        phone: '+1234567890',
        date_of_birth: '1990-05-15',
        address: '123 Main Street, North Zone',
        membership_type: 'premium',
        status: 'active',
        join_date: '2023-01-15',
        expiry_date: '2024-12-31',
        zone_id: 1
      },
      {
        member_id: 'MEM1002',
        first_name: 'Jane',
        last_name: 'Smith',
        email: 'jane.smith@example.com',
        phone: '+1234567891',
        date_of_birth: '1985-08-22',
        address: '456 Oak Avenue, South Zone',
        membership_type: 'vip',
        status: 'active',
        join_date: '2022-06-10',
        expiry_date: '2024-12-31',
        zone_id: 2
      },
      {
        member_id: 'MEM1003',
        first_name: 'Mike',
        last_name: 'Johnson',
        email: 'mike.johnson@example.com',
        phone: '+1234567892',
        date_of_birth: '1992-03-08',
        address: '789 Pine Road, East Zone',
        membership_type: 'basic',
        status: 'active',
        join_date: '2023-09-20',
        expiry_date: '2024-09-20',
        zone_id: 3
      },
      {
        member_id: 'MEM1004',
        first_name: 'Sarah',
        last_name: 'Wilson',
        email: 'sarah.wilson@example.com',
        phone: '+1234567893',
        date_of_birth: '1988-11-12',
        address: '321 Elm Street, West Zone',
        membership_type: 'lifetime',
        status: 'active',
        join_date: '2021-03-05',
        expiry_date: '2099-12-31',
        zone_id: 4
      },
      {
        member_id: 'MEM1005',
        first_name: 'David',
        last_name: 'Brown',
        email: 'david.brown@example.com',
        phone: '+1234567894',
        date_of_birth: '1995-07-30',
        address: '654 Maple Drive, Central Zone',
        membership_type: 'premium',
        status: 'active',
        join_date: '2023-12-01',
        expiry_date: '2024-12-01',
        zone_id: 5
      }
    ]);

    console.log(`Created ${members.length} members`);

    // Create sample events
    console.log('Creating sample events...');
    const events = await Event.bulkCreate([
      {
        title: 'Annual General Meeting',
        description: 'Join us for our annual general meeting where we discuss the year\'s achievements and plans for the future.',
        event_date: '2024-06-15T10:00:00Z',
        end_date: '2024-06-15T12:00:00Z',
        location: 'Community Center, Central Zone',
        event_type: 'meeting',
        max_attendees: 200,
        registration_fee: 0,
        status: 'upcoming'
      },
      {
        title: 'Networking Workshop',
        description: 'Learn effective networking strategies and build professional relationships.',
        event_date: '2024-07-20T14:00:00Z',
        end_date: '2024-07-20T16:00:00Z',
        location: 'Business Hub, North Zone',
        event_type: 'workshop',
        max_attendees: 50,
        registration_fee: 25.00,
        status: 'upcoming'
      },
      {
        title: 'Summer Social Mixer',
        description: 'A casual social event to meet fellow members and enjoy refreshments.',
        event_date: '2024-08-10T18:00:00Z',
        end_date: '2024-08-10T21:00:00Z',
        location: 'Garden Plaza, South Zone',
        event_type: 'social',
        max_attendees: 100,
        registration_fee: 15.00,
        status: 'upcoming'
      },
      {
        title: 'Leadership Training Program',
        description: 'Comprehensive leadership development program for aspiring leaders.',
        event_date: '2024-09-05T09:00:00Z',
        end_date: '2024-09-07T17:00:00Z',
        location: 'Conference Center, East Zone',
        event_type: 'training',
        max_attendees: 30,
        registration_fee: 150.00,
        status: 'upcoming'
      }
    ]);

    console.log(`Created ${events.length} events`);

    // Create sample payments
    console.log('Creating sample payments...');
    const payments = await Payment.bulkCreate([
      {
        member_id: 1,
        amount: 99.99,
        payment_type: 'membership_fee',
        payment_method: 'card',
        status: 'completed',
        transaction_id: 'TXN001',
        payment_date: '2023-01-15T10:30:00Z',
        description: 'Premium membership fee'
      },
      {
        member_id: 2,
        amount: 199.99,
        payment_type: 'membership_fee',
        payment_method: 'bank_transfer',
        status: 'completed',
        transaction_id: 'TXN002',
        payment_date: '2022-06-10T14:20:00Z',
        description: 'VIP membership fee'
      },
      {
        member_id: 3,
        amount: 49.99,
        payment_type: 'membership_fee',
        payment_method: 'online',
        status: 'completed',
        transaction_id: 'TXN003',
        payment_date: '2023-09-20T16:45:00Z',
        description: 'Basic membership fee'
      },
      {
        member_id: 1,
        amount: 25.00,
        payment_type: 'event_fee',
        payment_method: 'card',
        status: 'completed',
        transaction_id: 'TXN004',
        payment_date: '2024-01-10T11:15:00Z',
        description: 'Networking Workshop registration'
      },
      {
        member_id: 2,
        amount: 15.00,
        payment_type: 'event_fee',
        payment_method: 'cash',
        status: 'completed',
        transaction_id: 'TXN005',
        payment_date: '2024-01-15T09:30:00Z',
        description: 'Summer Social Mixer registration'
      }
    ]);

    console.log(`Created ${payments.length} payments`);

    console.log('Database seeding completed successfully!');
    console.log('\nSample data created:');
    console.log(`- ${zones.length} zones`);
    console.log(`- ${members.length} members`);
    console.log(`- ${events.length} events`);
    console.log(`- ${payments.length} payments`);
    
    console.log('\nTest credentials:');
    console.log('Email: john.doe@example.com');
    console.log('Password: password123');
    console.log('Member ID: MEM1001');

  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    await sequelize.close();
  }
}

// Run the seeding function
seedDatabase(); 