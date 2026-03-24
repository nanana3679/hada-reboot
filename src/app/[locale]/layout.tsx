import Navigation from '@/components/Navigation/Navigation';
import { SnackbarProvider } from '@/components/Snackbar/SnackbarProvider';

import I18nProvider from '@/providers/I18nProvider';
import { StoreProvider } from '@/providers/StoreProvider';
import { QueryProvider } from '@/providers/QueryProvider';
import ErrorBoundaryWrapper from '@/providers/ErrorBoundaryWrapper';

import { getAuth } from '@/auth';
import UserOptionInitializer from '@/components/UserOptionInitializer';

import styles from './layout.module.scss';

const NavigationLayout = async ({ children }: { children: React.ReactNode }) => {
  const { auth } = await getAuth();
  const session = await auth();
  const isLoggedIn = !!session;

  return (
    <ErrorBoundaryWrapper>
      <StoreProvider>
        <QueryProvider>
          <div className={styles['navigation-layout']}>
            <I18nProvider>
              <SnackbarProvider>
                <Navigation isLoggedIn={isLoggedIn} />
                {isLoggedIn && <UserOptionInitializer />}
                {children}
              </SnackbarProvider>
            </I18nProvider>
          </div>
        </QueryProvider>
      </StoreProvider>
    </ErrorBoundaryWrapper>
  );
};

export default NavigationLayout;
