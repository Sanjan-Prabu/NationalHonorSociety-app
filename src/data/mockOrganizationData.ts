// Mock data for testing organization functionality before database setup

export const mockAnnouncements = {
  NHS: [
    {
      id: '1',
      title: 'NHS Welcome Meeting',
      content: 'Welcome to the new school year! Join us for our first NHS meeting this Friday.',
      type: 'general' as const,
      organization: 'NHS',
      author_id: 'officer1',
      author_name: 'NHS Officer',
      created_at: new Date().toISOString(),
    },
    {
      id: '2',
      title: 'Volunteer Hours Reminder',
      content: 'Don\'t forget to log your volunteer hours from last month\'s activities.',
      type: 'reminder' as const,
      organization: 'NHS',
      author_id: 'officer1',
      author_name: 'NHS Officer',
      created_at: new Date(Date.now() - 86400000).toISOString(),
    }
  ],
  NHSA: [
    {
      id: '3',
      title: 'NHSA Beach Cleanup',
      content: 'Join us this Saturday for our monthly beach cleanup event at Sunset Beach.',
      type: 'event' as const,
      organization: 'NHSA',
      author_id: 'officer2',
      author_name: 'NHSA Officer',
      created_at: new Date().toISOString(),
    },
    {
      id: '4',
      title: 'NHSA Scholarship Applications',
      content: 'Scholarship applications are now open for NHSA members. Deadline is next month.',
      type: 'urgent' as const,
      organization: 'NHSA',
      author_id: 'officer2',
      author_name: 'NHSA Officer',
      created_at: new Date(Date.now() - 172800000).toISOString(),
    }
  ]
};

export const mockEvents = {
  NHS: [
    {
      id: '1',
      title: 'NHS Food Drive',
      description: 'Collect food donations for the local food bank. Bring non-perishable items.',
      date: new Date(Date.now() + 604800000).toISOString().split('T')[0], // Next week
      start_time: '09:00',
      end_time: '15:00',
      location: 'School Cafeteria',
      category: 'volunteer' as const,
      organization: 'NHS',
      created_by: 'officer1',
      created_at: new Date().toISOString(),
    },
    {
      id: '2',
      title: 'NHS Monthly Meeting',
      description: 'Regular monthly meeting to discuss upcoming events and volunteer opportunities.',
      date: new Date(Date.now() + 1209600000).toISOString().split('T')[0], // Two weeks
      start_time: '15:30',
      end_time: '16:30',
      location: 'Room 201',
      category: 'meeting' as const,
      organization: 'NHS',
      created_by: 'officer1',
      created_at: new Date().toISOString(),
    }
  ],
  NHSA: [
    {
      id: '3',
      title: 'NHSA Community Garden',
      description: 'Help maintain the community garden and plant new vegetables for the season.',
      date: new Date(Date.now() + 432000000).toISOString().split('T')[0], // 5 days
      start_time: '08:00',
      end_time: '12:00',
      location: 'Community Center Garden',
      category: 'volunteer' as const,
      organization: 'NHSA',
      created_by: 'officer2',
      created_at: new Date().toISOString(),
    },
    {
      id: '4',
      title: 'NHSA Fundraising Event',
      description: 'Annual fundraising event to support local charities and community programs.',
      date: new Date(Date.now() + 1814400000).toISOString().split('T')[0], // 3 weeks
      start_time: '18:00',
      end_time: '21:00',
      location: 'School Gymnasium',
      category: 'fundraising' as const,
      organization: 'NHSA',
      created_by: 'officer2',
      created_at: new Date().toISOString(),
    }
  ]
};

export const mockVolunteerHours = {
  NHS: [
    {
      id: '1',
      member_id: 'member1',
      member_name: 'John Doe',
      event_name: 'Library Tutoring',
      hours: 3.5,
      date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
      status: 'pending' as const,
      description: 'Helped elementary students with reading and math homework.',
      organization: 'NHS',
      created_at: new Date().toISOString(),
    }
  ],
  NHSA: [
    {
      id: '2',
      member_id: 'member2',
      member_name: 'Jane Smith',
      event_name: 'Senior Center Visit',
      hours: 2.0,
      date: new Date(Date.now() - 172800000).toISOString().split('T')[0],
      status: 'approved' as const,
      description: 'Spent time with seniors, played games and helped with activities.',
      organization: 'NHSA',
      reviewed_by: 'officer2',
      reviewed_at: new Date(Date.now() - 86400000).toISOString(),
      created_at: new Date(Date.now() - 172800000).toISOString(),
    }
  ]
};

// Helper function to get mock data by organization
export const getMockData = (tableName: string, organization: string) => {
  switch (tableName) {
    case 'announcements':
      return mockAnnouncements[organization as keyof typeof mockAnnouncements] || [];
    case 'events':
      return mockEvents[organization as keyof typeof mockEvents] || [];
    case 'volunteer_hours':
      return mockVolunteerHours[organization as keyof typeof mockVolunteerHours] || [];
    default:
      return [];
  }
};