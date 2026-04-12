import { useParams } from 'react-router-dom';
import BrandSignupForm from './BrandSignupForm';
import InfluencerSignupForm from './InfluencerSignupForm';

const SignupForm = () => {
  const { role = 'brand' } = useParams();
  const isBrand = role === 'brand';

  if (isBrand) {
    return <BrandSignupForm />;
  }

  return <InfluencerSignupForm />;
};

export default SignupForm;

