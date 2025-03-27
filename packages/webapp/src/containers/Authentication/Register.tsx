// @ts-nocheck
import intl from 'react-intl-universal';
import { Formik } from 'formik';
import { Link, useHistory } from 'react-router-dom';
import { Intent } from '@blueprintjs/core';

import { AppToaster, FormattedMessage as T } from '@/components';
import AuthInsider from '@/containers/Authentication/AuthInsider';
import { useAuthLogin, useAuthRegister } from '@/hooks/query/authentication';
import withOrganizationActions from '@/containers/Organization/withOrganizationActions';
import { compose } from '@/utils';

import RegisterForm from './RegisterForm';
import {
  RegisterSchema,
  transformRegisterErrorsToForm,
  transformRegisterToastMessages,
} from './utils';
import {
  AuthFooterLinks,
  AuthFooterLink,
  AuthInsiderCard,
} from './_components';

const initialValues = {
  first_name: '',
  last_name: '',
  email: '',
  password: '',
};

/**
 * Register form.
 */
function RegisterUserForm({ setOrganizationSetupCompleted }) {
  const { mutateAsync: authLoginMutate } = useAuthLogin();
  const { mutateAsync: authRegisterMutate } = useAuthRegister();
  const history = useHistory();

  const handleSubmit = (values, { setSubmitting, setErrors }) => {
    authRegisterMutate(values)
      .then(() => {
        authLoginMutate({
          crediential: values.email,
          password: values.password,
        })
        .then(() => {
          // Bypass the initialization page by marking organization setup as completed
          try {
            setOrganizationSetupCompleted(true);
          } catch (err) {
            console.error('Failed to mark organization setup as completed:', err);
          }
          
          // Show success message
          AppToaster.show({
            message: intl.get('registration_successful'),
            intent: Intent.SUCCESS,
          });
          
          // Redirect to dashboard after a short delay
          setTimeout(() => {
            history.push('/');
          }, 1000);
        })
        .catch(
          ({
            response: {
              data: { errors },
            },
          }) => {
            AppToaster.show({
              message: intl.get('something_wentwrong'),
              intent: Intent.DANGER,
            });
            setSubmitting(false);
          },
        );
      })
      .catch(
        ({
          response: {
            data: { errors },
          },
        }) => {
          const formErrors = transformRegisterErrorsToForm(errors);
          const toastMessages = transformRegisterToastMessages(errors);

          toastMessages.forEach((toastMessage) => {
            AppToaster.show(toastMessage);
          });
          setErrors(formErrors);
          setSubmitting(false);
        },
      );
  };

  return (
    <AuthInsider>
      <AuthInsiderCard>
        <Formik
          initialValues={initialValues}
          validationSchema={RegisterSchema}
          onSubmit={handleSubmit}
          component={RegisterForm}
        />
      </AuthInsiderCard>

      <RegisterFooterLinks />
    </AuthInsider>
  );
}

function RegisterFooterLinks() {
  return (
    <AuthFooterLinks>
      <AuthFooterLink>
        <T id={'return_to'} />{' '}
        <Link to={'/auth/login'}>
          <T id={'sign_in'} />
        </Link>
      </AuthFooterLink>

      <AuthFooterLink>
        <Link to={'/auth/send_reset_password'}>
          <T id={'forgot_my_password'} />
        </Link>
      </AuthFooterLink>
    </AuthFooterLinks>
  );
}

// Export with the withOrganizationActions HOC to get access to setOrganizationSetupCompleted
export default compose(
  withOrganizationActions
)(RegisterUserForm);
