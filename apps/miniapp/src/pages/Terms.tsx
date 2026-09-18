import { Link } from "react-router";
import { SUPPORT_EMAIL } from "@/lib/env";

function Terms() {
  return (
    <div className="min-h-screen bg-white px-5 py-8 text-black">
      <header className="mb-6">
        <Link to="/" className="text-sm text-gray-500 hover:text-black">
          &larr; Back
        </Link>
        <h1 className="mt-4 text-2xl font-bold">Terms of Service</h1>
        <p className="mt-1 text-sm text-gray-500">Last updated: February 2026</p>
      </header>

      <div className="space-y-6 text-sm leading-relaxed text-gray-700">
        <section>
          <h2 className="mb-2 text-base font-semibold text-black">1. Acceptance of Terms</h2>
          <p>
            By accessing or using Halo (&quot;the Service&quot;), operated by Human Labs, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the Service.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-black">2. Service Description</h2>
          <p>
            Halo is a receipt scanning and rewards application that allows users to upload receipts and earn points. Points are tracked on the Celo blockchain through smart contracts.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-black">3. Eligibility</h2>
          <p>
            You must be at least 18 years old to use the Service. By using Halo, you represent that you meet this requirement.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-black">4. User Responsibilities</h2>
          <p>You agree to:</p>
          <ul className="mt-2 list-disc pl-5 space-y-1">
            <li>Provide accurate and authentic receipts only</li>
            <li>Not submit fraudulent, duplicate, or manipulated receipts</li>
            <li>Use the Service in compliance with all applicable laws</li>
            <li>Maintain the security of your wallet credentials</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-black">5. Points and Rewards</h2>
          <p>
            Points earned through the Service are non-transferable and tracked on-chain. Human Labs reserves the right to modify the points system, reject invalid receipts, or revoke points obtained through fraudulent means.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-black">6. Intellectual Property</h2>
          <p>
            All content, features, and functionality of the Service are owned by Human Labs and are protected by applicable intellectual property laws.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-black">7. Disclaimers</h2>
          <p>
            The Service is provided &quot;as is&quot; without warranties of any kind. Human Labs does not guarantee uninterrupted access or that the Service will be error-free. We are not responsible for any loss of points or data due to technical issues.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-black">8. Limitation of Liability</h2>
          <p>
            To the maximum extent permitted by law, Human Labs shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the Service.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-black">9. Operator Information</h2>
          <p>
            This application is operated by Human Labs. Halo is not operated by, affiliated with, or endorsed by Opera or MiniPay.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-black">10. Changes to Terms</h2>
          <p>
            We may update these Terms at any time. Continued use of the Service after changes constitutes acceptance of the new Terms.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-black">11. Contact</h2>
          <p>
            For questions about these Terms, contact us at:{" "}
            <a href={`mailto:${SUPPORT_EMAIL}`} className="text-blue-600 underline">
              {SUPPORT_EMAIL}
            </a>
          </p>
        </section>
      </div>
    </div>
  );
}

export default Terms;
