import React from 'react';
import { Link } from 'react-router-dom';
import { FileText, ArrowLeft } from 'lucide-react';

const SECTIONS = [
  {
    title: '1. Eligibility',
    text: 'To use our platform, you must:',
    list: [
      'Be at least 18 years old',
      'Have the legal capacity to enter into binding agreements',
      'Provide accurate and complete registration information',
    ],
    footer: 'We may refuse access or suspend accounts that violate these requirements.',
  },
  {
    title: '2. Our Services',
    text: 'We provide an event management platform that may include:',
    list: [
      'Event planning and coordination tools',
      'Vendor discovery and booking',
      'Budgeting and financial planning tools',
      'Task management and scheduling',
      'Communication tools between users, vendors, and teams',
      'AI-assisted event planning features',
      'Inventory and resource tracking',
      'Payment facilitation (where applicable)',
    ],
    footer: 'We may update, modify, or discontinue features at any time.',
  },
  {
    title: '3. User Accounts',
    text: 'To access certain features, you must create an account. You agree to:',
    list: [
      'Provide accurate and up-to-date information',
      'Maintain confidentiality of your login credentials',
      'Accept responsibility for all activity under your account',
      'Notify us immediately of any unauthorized access',
    ],
    footer: 'We are not liable for losses resulting from unauthorized account use.',
  },
  {
    title: '4. Event and Vendor Relationships',
    text: 'Our platform connects users (clients, planners, vendors, and service providers), but:',
    list: [
      'We do not directly provide event services',
      'We are not responsible for the quality, delivery, or performance of vendors',
      'Any agreement between users and vendors is strictly between those parties',
    ],
    footer: 'We may facilitate communication but are not a party to service contracts.',
  },
  {
    title: '5. Payments',
    text: 'Where payment services are enabled:',
    list: [
      'Payments may be processed via third-party providers (e.g., mobile money, cards, Stripe, Paystack)',
      'We are not responsible for payment processing errors caused by third parties',
      'Fees, commissions, or subscription charges will be clearly displayed before payment',
    ],
    footer: 'Refunds (if applicable) are subject to platform policy or vendor agreements.',
  },
  {
    title: '6. Acceptable Use',
    text: 'You agree not to:',
    list: [
      'Use the platform for illegal or fraudulent activities',
      'Upload false, misleading, or harmful content',
      'Harass, abuse, or harm other users or vendors',
      'Attempt to hack, disrupt, or reverse-engineer the platform',
      'Use automated systems (bots) without authorization',
      'Misrepresent services, identity, or event details',
    ],
    footer: 'We may suspend or permanently terminate accounts that violate these rules.',
  },
  {
    title: '7. User Content',
    text: 'Users may upload event details, images and documents, vendor listings, and reviews and feedback. You retain ownership of your content, but you grant us a non-exclusive license to use it for:',
    list: [
      'Operating and improving the platform',
      'Displaying content to relevant users',
      'Marketing and promotional purposes (with consent where required)',
    ],
    footer: 'We may remove content that violates these Terms.',
  },
  {
    title: '8. AI Features',
    text: 'Our platform may include AI-powered tools that generate event checklists, budgets and timelines, vendor suggestions, seating plans and reports. You understand that:',
    list: [
      'AI outputs are for guidance only',
      'We do not guarantee accuracy or completeness',
      'Final decisions remain your responsibility',
    ],
  },
  {
    title: '9. Third-Party Services',
    text: 'Our platform may integrate third-party services such as:',
    list: [
      'Payment providers',
      'Cloud storage providers',
      'Analytics tools',
      'AI model providers',
    ],
    footer: 'We are not responsible for third-party services, their actions, or their policies.',
  },
  {
    title: '10. Limitation of Liability',
    text: 'To the maximum extent permitted by law:',
    list: [
      'We are not liable for indirect, incidental, or consequential damages',
      'We are not responsible for losses caused by vendors or third parties',
      'We do not guarantee uninterrupted or error-free service',
      'Our total liability is limited to the amount paid by you (if any) in the last 3 months',
    ],
  },
  {
    title: '11. Suspension and Termination',
    text: 'We may suspend or terminate your account if:',
    list: [
      'You violate these Terms',
      'You engage in fraudulent or harmful activity',
      'Required by law or regulatory authority',
    ],
    footer: 'You may also stop using the platform at any time.',
  },
  {
    title: '12. Intellectual Property',
    text: 'All platform content, including software, design, logos, branding, and features and workflows, are owned by A-SAC GROUP LTD or its licensors and are protected by intellectual property laws. You may not copy, modify, or distribute without permission.',
  },
  {
    title: '13. Data Protection',
    text: (
      <>
        We process personal data in accordance with our{' '}
        <Link to="/privacy-policy" className="text-[#0F4C5C] font-medium hover:underline">
          Privacy Policy
        </Link>{' '}
        and applicable laws, including Rwanda&apos;s Data Protection and Privacy Law.
      </>
    ),
  },
  {
    title: '14. Changes to Terms',
    text: 'We may update these Terms from time to time. Users will be notified of significant changes. Continued use of the platform means acceptance of the updated Terms.',
  },
  {
    title: '15. Governing Law',
    text: 'These Terms are governed by the laws of the Republic of Rwanda. Any disputes will be resolved under the jurisdiction of Rwandan courts.',
  },
];

function TermsSection({ section }) {
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
    </div>
  );
}

export default function TermsPage() {
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
            <FileText size={24} className="text-white" />
          </div>
          <h1 className="text-4xl font-bold mb-3" style={{ fontFamily: 'Poppins,sans-serif' }}>
            Terms &amp; Conditions
          </h1>
          <p className="text-white/70 text-sm">Last updated: 26/05/2026</p>
          <p className="text-white/60 text-sm mt-2 max-w-xl mx-auto leading-relaxed">
            These Terms and Conditions (&ldquo;Terms&rdquo;) govern your use of the platform operated by PLANi
            under A-SAC GROUP Ltd. By accessing or using our services, you agree to be bound by these Terms.
            If you do not agree, you must stop using the platform immediately.
          </p>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-6 py-14">
        <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-sm p-8 md:p-12">
          {SECTIONS.map((section, i) => (
            <TermsSection key={i} section={section} />
          ))}

          {/* Contact section */}
          <div className="mt-6 pt-8 border-t border-[#E5E7EB]">
            <h2
              className="text-xl font-bold text-[#111827] mb-4"
              style={{ fontFamily: 'Poppins,sans-serif' }}
            >
              16. Contact Information
            </h2>
            <p className="text-[#4B5563] text-sm leading-relaxed mb-4">
              If you have any questions about these Terms, contact us at:
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
          <Link to="/privacy-policy" className="hover:text-[#0F4C5C] transition-colors">Privacy Policy</Link>
        </p>
      </footer>
    </div>
  );
}
