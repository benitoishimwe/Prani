import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, ArrowLeft } from 'lucide-react';
import PlaniLogo from '../components/PlaniLogo';

const SECTIONS = [
  {
    title: '1. Information We Collect',
    content: null,
    subsections: [
      {
        title: 'Account Information',
        text: 'We collect your name, phone number, email address, and optional profile photo. When you register as an event planner, vendor, or team member, we may also collect business details such as company name, services offered, and location.',
      },
      {
        title: 'Event & Service Data',
        text: 'We collect information related to events you create or participate in, including:',
        list: [
          'Event details (type, date, location, guest count)',
          'Budgets and financial estimates',
          'Vendor bookings and communications',
          'Task lists, timelines, and schedules',
          'Uploaded documents and images (e.g., invitations, contracts, event photos)',
        ],
      },
      {
        title: 'Vendor Information',
        text: 'For vendors, we may collect service listings, pricing, availability, images, and reviews submitted by clients.',
      },
      {
        title: 'Usage Data',
        text: 'This includes information such as your Internet Protocol (IP) address, device type, operating system, browser type, approximate location based on IP, session duration, clicks, pages viewed, and interaction with platform features.',
      },
      {
        title: 'Communication Data',
        text: 'We may collect messages sent through the platform, including inquiries between users, vendors, and event organizers, for the purpose of enabling service delivery and improving quality.',
      },
      {
        title: 'Cookies & Analytics',
        text: 'We use cookies and analytics tools to understand user behavior, improve performance, and enhance user experience.',
      },
    ],
  },
  {
    title: '2. How We Use Your Information',
    text: 'We use your information to:',
    list: [
      'Operate, maintain, and provide access to the platform and its services',
      'Facilitate event planning, vendor bookings, and coordination',
      'Generate event insights, budgets, timelines, and recommendations',
      'Improve platform features and user experience',
      'Communicate important updates, notifications, and service alerts',
      'Verify users and prevent fraud or misuse',
      'Conduct analytics, research, and product development',
      'Comply with legal and regulatory obligations',
    ],
  },
  {
    title: '3. Sharing and Disclosure of Information',
    text: 'We do not sell your personal data. We may share your information only in the following cases:',
    subsections: [
      {
        title: 'Service Providers',
        text: 'We may share data with trusted third-party providers for:',
        list: [
          'Cloud hosting and storage',
          'Payment processing',
          'Analytics and performance monitoring',
          'AI and automation services',
        ],
      },
      {
        title: 'Event Participants',
        text: 'Certain information (such as vendor contact details, event schedules, or booking status) may be shared between relevant users to enable event execution.',
      },
      {
        title: 'Legal Requirements',
        text: "We may disclose information if required by law, regulation, or government request, or to protect our rights, users, or public safety.",
      },
    ],
  },
  {
    title: '4. Data Storage & Security',
    text: "We use reasonable technical and organizational measures to protect your data against unauthorized access, loss, misuse, or alteration. Your data may be stored on secure servers located outside Rwanda, in compliance with applicable data protection laws, including Rwanda's Data Protection and Privacy Law. Users are responsible for maintaining the confidentiality of their login credentials.",
  },
  {
    title: '5. Third-Party Services',
    text: 'We may use third-party services to operate and improve our platform, including:',
    list: [
      'Cloud hosting providers',
      'Payment processors (e.g., mobile money or card systems)',
      'Analytics tools',
      'AI service providers',
    ],
    footer: 'Each third-party provider has its own privacy policy governing how they handle your data.',
  },
  {
    title: '6. Your Privacy Rights',
    text: "Under Rwanda's Law Nº 058/2021 of 13/10/2021 on the Protection of Personal Data and Privacy, you have the following rights:",
    list: [
      'The right to access your personal data',
      'The right to request correction of inaccurate data',
      'The right to request deletion of your personal data',
      'The right to be informed about how your data is used',
      'The right to object to certain processing activities',
      'The right to know if your data is transferred internationally',
      'The right to lodge a complaint with the supervisory authority',
    ],
    footer: 'To exercise these rights, contact us using the details below.',
  },
  {
    title: '7. Data Retention',
    text: 'We retain your personal data only for as long as necessary to:',
    list: [
      'Provide our services',
      'Comply with legal obligations',
      'Resolve disputes',
      'Enforce agreements',
    ],
    footer: 'When data is no longer needed, it is securely deleted or anonymized.',
  },
  {
    title: '8. Children\'s Privacy',
    text: "Our services are not intended for individuals under the age of 18. We do not knowingly collect personal data from children. If we become aware of such data, we will delete it immediately.",
  },
  {
    title: '9. International Data Transfers',
    text: 'Your data may be transferred to and processed in countries outside Rwanda. We ensure that appropriate safeguards are in place to protect your information in accordance with applicable laws.',
  },
  {
    title: '10. Updates to This Privacy Policy',
    text: 'We may update this Privacy Policy from time to time. Users will be notified of significant changes through the platform or by email. Continued use of the service means you accept the updated policy.',
  },
];

function PolicySection({ section }) {
  return (
    <div className="mb-10">
      <h2
        className="text-xl font-bold text-[#111827] mb-3"
        style={{ fontFamily: 'Poppins, sans-serif' }}
      >
        {section.title}
      </h2>
      {section.text && (
        <p className="text-[#4B5563] text-sm leading-relaxed mb-3">{section.text}</p>
      )}
      {section.list && (
        <ul className="list-disc list-inside space-y-1.5 text-sm text-[#4B5563] mb-3 ml-2">
          {section.list.map((item, i) => <li key={i}>{item}</li>)}
        </ul>
      )}
      {section.footer && (
        <p className="text-[#4B5563] text-sm leading-relaxed">{section.footer}</p>
      )}
      {section.subsections && (
        <div className="space-y-5 mt-2">
          {section.subsections.map((sub, i) => (
            <div key={i} className="pl-4 border-l-2 border-[#E5E7EB]">
              <h3 className="font-semibold text-[#111827] text-sm mb-1.5">{sub.title}</h3>
              {sub.text && (
                <p className="text-[#4B5563] text-sm leading-relaxed mb-2">{sub.text}</p>
              )}
              {sub.list && (
                <ul className="list-disc list-inside space-y-1 text-sm text-[#4B5563] ml-2">
                  {sub.list.map((item, j) => <li key={j}>{item}</li>)}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-[#F9F9FB] font-sans">
      {/* Nav */}
      <nav className="bg-white border-b border-[#E5E7EB] sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#0F4C5C] flex items-center justify-center">
              <span className="text-white font-bold text-sm" style={{ fontFamily: 'Poppins,sans-serif' }}>P</span>
            </div>
            <span className="text-lg font-bold text-[#111827]" style={{ fontFamily: 'Poppins,sans-serif' }}>Plani</span>
          </Link>
          <Link
            to="/"
            className="flex items-center gap-1.5 text-sm text-[#6B7280] hover:text-[#0F4C5C] transition-colors"
          >
            <ArrowLeft size={15} />
            Back to home
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <div className="bg-[#0F4C5C] py-14 text-white text-center">
        <div className="max-w-4xl mx-auto px-6">
          <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-4">
            <Shield size={24} className="text-white" />
          </div>
          <h1 className="text-4xl font-bold mb-3" style={{ fontFamily: 'Poppins,sans-serif' }}>
            Privacy Policy
          </h1>
          <p className="text-white/70 text-sm">Last updated: 26/05/2026</p>
          <p className="text-white/60 text-sm mt-2 max-w-xl mx-auto leading-relaxed">
            This Privacy Policy explains how PLANi under A-SAC GROUP Ltd collects, uses, and protects
            your personal information when you use our platform and related services.
          </p>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-6 py-14">
        <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-sm p-8 md:p-12">
          {SECTIONS.map((section, i) => (
            <PolicySection key={i} section={section} />
          ))}

          {/* Contact section */}
          <div className="mt-6 pt-8 border-t border-[#E5E7EB]">
            <h2
              className="text-xl font-bold text-[#111827] mb-4"
              style={{ fontFamily: 'Poppins,sans-serif' }}
            >
              11. Contact Us
            </h2>
            <p className="text-[#4B5563] text-sm leading-relaxed mb-4">
              If you have any questions about this Privacy Policy or how we handle your data, please contact:
            </p>
            <div className="bg-[#F0F9FC] border border-[#BFE0EA] rounded-xl p-5 text-sm text-[#0F4C5C] space-y-1">
              <p className="font-semibold text-[#0F4C5C]">PLANi</p>
              <p>A-SAC GROUP LTD</p>
              <p>KIGALI, RWANDA</p>
              <a
                href="mailto:support@plani.pro"
                className="inline-block mt-1 text-[#0F4C5C] font-medium hover:underline"
              >
                support@plani.pro
              </a>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#E5E7EB] py-8 text-center text-sm text-[#9CA3AF]">
        <p>
          © 2026 Plani — A-SAC GROUP LTD. All rights reserved.{' '}
          <Link to="/terms" className="hover:text-[#0F4C5C] transition-colors">Terms &amp; Conditions</Link>
        </p>
      </footer>
    </div>
  );
}
