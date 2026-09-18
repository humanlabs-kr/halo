import { Link } from "react-router";
import { SUPPORT_EMAIL } from "@/lib/env";

function Privacy() {
  return (
    <div className="min-h-screen bg-white px-5 py-8 text-black">
      <header className="mb-6">
        <Link to="/" className="text-sm text-gray-500 hover:text-black">
          &larr; Back
        </Link>
        <h1 className="mt-4 text-2xl font-bold">Privacy Policy</h1>
        <p className="mt-1 text-sm text-gray-500">Last updated: February 2026</p>
      </header>

      <div className="space-y-6 text-sm leading-relaxed text-gray-700">
        <section>
          <h2 className="mb-2 text-base font-semibold text-black">1. Introduction</h2>
          <p>
            Human Labs (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) operates Halo. This Privacy Policy explains how we collect, use, and protect your information when you use our Service.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-black">2. Operator Information</h2>
          <p>
            This application is operated by Human Labs. Halo is not operated by, affiliated with, or endorsed by Opera or MiniPay.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-black">3. Information We Collect</h2>
          <p>We collect the following types of information:</p>
          <ul className="mt-2 list-disc pl-5 space-y-1">
            <li><strong>Wallet Address:</strong> Your Celo wallet address for identification and point tracking</li>
            <li><strong>Receipt Images:</strong> Photos of receipts you upload for verification</li>
            <li><strong>Receipt Data:</strong> Extracted information including merchant name, date, and total amount</li>
            <li><strong>Transaction Data:</strong> On-chain point claim transactions</li>
            <li><strong>Usage Data:</strong> App interactions and feature usage for service improvement</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-black">4. How We Use Your Information</h2>
          <p>We use collected information to:</p>
          <ul className="mt-2 list-disc pl-5 space-y-1">
            <li>Verify and process receipt submissions</li>
            <li>Calculate and award points</li>
            <li>Prevent fraud and duplicate submissions</li>
            <li>Improve our Service and user experience</li>
            <li>Communicate important updates about the Service</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-black">5. Data Storage and Security</h2>
          <p>
            Your data is stored on secure servers using Cloudflare infrastructure. Receipt images are stored in encrypted cloud storage. We implement industry-standard security measures to protect your information.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-black">6. Blockchain Data</h2>
          <p>
            Point balances and claim transactions are recorded on the Celo blockchain. Blockchain data is public and immutable. Your wallet address and point transactions are visible on-chain.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-black">7. Data Sharing</h2>
          <p>
            We do not sell your personal information. We may share data with:
          </p>
          <ul className="mt-2 list-disc pl-5 space-y-1">
            <li>Service providers who assist in operating the Service</li>
            <li>Law enforcement when required by applicable law</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-black">8. Data Retention</h2>
          <p>
            We retain your data for as long as your account is active or as needed to provide the Service. Receipt images may be retained for fraud prevention purposes.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-black">9. Your Rights</h2>
          <p>
            You may request access to, correction of, or deletion of your personal data by contacting us. Note that on-chain data cannot be deleted due to the immutable nature of blockchain.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-black">10. Children&apos;s Privacy</h2>
          <p>
            The Service is not intended for users under 18 years of age. We do not knowingly collect information from children.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-black">11. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. We will notify you of significant changes through the Service.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-black">12. Contact Us</h2>
          <p>
            For privacy-related questions or requests, contact us at:{" "}
            <a href={`mailto:${SUPPORT_EMAIL}`} className="text-blue-600 underline">
              {SUPPORT_EMAIL}
            </a>
          </p>
        </section>
      </div>
    </div>
  );
}

export default Privacy;
