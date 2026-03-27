import FeatureTabs from '../../components/landing/FeatureTabs'
import Footer from '../../components/landing/Footer'
import Hero from '../../components/landing/Hero'
import HowItWorks from '../../components/landing/HowItWorks'
import LogoMarquee from '../../components/landing/LogoMarquee'
import Navbar from '../../components/landing/Navbar'
import RoleCards from '../../components/landing/RoleCards'
import Testimonials from '../../components/landing/Testimonials'

export default function LandingPage() {
  return (
    <div>
      <Navbar />
      <Hero />
      <RoleCards />
      <LogoMarquee />
      <HowItWorks />
      <FeatureTabs />
      <Testimonials />
      <Footer />
    </div>
  )
}
