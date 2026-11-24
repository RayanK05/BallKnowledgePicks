import styles from "./AuthPage.module.css";

function AuthPage() {
  return (
    <div className={styles.page}>
      <div className={styles.brand}>
        {/* left side: app name, tagline, features */}
        <p>Ball Knowledge Picks</p>
      </div>

      <div className={styles.formSide}>
        {/* right side: tabs + login/register form */}
        <p>Login here</p>
      </div>
    </div>
  );
}

export default AuthPage;
