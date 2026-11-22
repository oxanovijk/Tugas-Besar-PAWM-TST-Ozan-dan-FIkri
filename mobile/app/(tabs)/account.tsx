import { useEffect, useRef, useState } from 'react';
import { AppState, Keyboard, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { ApiError, InsecureAuthOriginError } from '../../src/ApiService';
import { accountSession } from '../../src/accountSession';
import { validateLogin } from '../../src/loginValidation';
import { expiredSession, SessionStorageError, type AccountSession } from '../../src/sessionService';
import { Brand, Button, color, Feedback, font, Icon, Loading, Page, textStyle } from '../../src/ui';

type ScreenSession = AccountSession | { status: 'checking' } | { status: 'restoreError' };

function actionError(error: unknown, action: 'login' | 'logout') {
  if (error instanceof InsecureAuthOriginError || error instanceof SessionStorageError) {
    return error.message;
  }
  if (action === 'logout') return 'Sesi belum bisa dihapus dari perangkat. Coba lagi.';
  if (error instanceof ApiError) {
    if (error.status === 401) return 'Email atau kata sandi salah.';
    if (error.status === 404) return 'Layanan login belum tersedia di alamat API ini.';
    if (error.status === 422) return 'Periksa kembali email dan kata sandi Anda.';
    if (error.status === 429) {
      return error.retryAfter
        ? 'Terlalu banyak percobaan. Coba lagi dalam ' + error.retryAfter + ' detik.'
        : 'Terlalu banyak percobaan. Tunggu sebentar sebelum mencoba lagi.';
    }
  }
  return 'Layanan login belum bisa dihubungi. Periksa koneksi, lalu coba lagi.';
}

export default function AccountScreen() {
  const [session, setSession] = useState<ScreenSession>({ status: 'checking' });
  const [restoreAttempt, setRestoreAttempt] = useState(0);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [visible, setVisible] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const actionInProgress = useRef(false);
  const errors = attempted ? validateLogin(email, password) : {};

  useEffect(() => {
    let active = true;
    void accountSession.restore().then(
      (result) => { if (active) setSession(result); },
      () => { if (active) setSession({ status: 'restoreError' }); },
    );
    return () => { active = false; };
  }, [restoreAttempt]);

  useEffect(() => {
    if (session.status !== 'signedIn') return;

    const expiresAt = session.session.expiresAt;
    const expire = () => {
      if (Date.now() >= expiresAt && !actionInProgress.current) {
        setSession((current) => current === session ? expiredSession : current);
        setNotice('');
      }
    };
    const timer = setTimeout(expire, Math.max(0, expiresAt - Date.now()));
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') expire();
    });
    return () => {
      clearTimeout(timer);
      subscription.remove();
    };
  }, [session]);

  async function run(action: 'login' | 'logout', work: () => Promise<AccountSession>) {
    if (actionInProgress.current) return;
    actionInProgress.current = true;
    setBusy(true);
    setNotice('');
    try {
      setSession(await work());
    } catch (error) {
      setNotice(actionError(error, action));
    } finally {
      actionInProgress.current = false;
      setBusy(false);
    }
  }

  function submit() {
    if (actionInProgress.current) return;
    if (Object.keys(validateLogin(email, password)).length) {
      setAttempted(true);
      setNotice('');
      return;
    }

    Keyboard.dismiss();
    setAttempted(false);
    const enteredPassword = password;
    setPassword('');
    setVisible(false);
    void run('login', () => accountSession.signIn(email, enteredPassword));
  }

  if (session.status === 'checking' || session.status === 'restoreError') {
    return (
      <Page>
        <Brand />
        <View style={styles.heading}>
          {session.status === 'checking' ? <Loading message="Memeriksa sesi…" /> : (
            <Feedback
              title="Sesi belum bisa diperiksa"
              description="Periksa koneksi, lalu coba lagi."
              action="Coba lagi"
              onPress={() => {
                setSession({ status: 'checking' });
                setRestoreAttempt((attempt) => attempt + 1);
              }}
            />
          )}
        </View>
      </Page>
    );
  }

  if (session.status === 'signedIn') {
    return (
      <Page>
        <Brand />
        <View style={styles.heading}>
          <Text accessibilityRole="header" style={textStyle.title}>Akun saya</Text>
        </View>
        <View style={styles.profile}>
          <View style={styles.profileIcon}><Icon name="user" size={24} /></View>
          <View style={styles.profileText}>
            <Text style={textStyle.supporting}>Email</Text>
            <Text style={textStyle.label}>{session.user.email}</Text>
          </View>
        </View>
        <Button
          icon="log-out"
          pending={busy}
          onPress={() => { void run('logout', () => accountSession.signOut(session.session)); }}
        >
          {busy ? 'Sedang keluar…' : 'Keluar'}
        </Button>
        {!!notice && <Text accessibilityRole="alert" style={styles.notice}>{notice}</Text>}
      </Page>
    );
  }

  const message = notice || session.message;

  return (
    <Page>
      <Brand />
      <View style={styles.heading}>
        <Text accessibilityRole="header" style={textStyle.title}>Masuk</Text>
        <Text style={textStyle.supporting}>Gunakan akun JejakNusantara Anda.</Text>
      </View>

      <View style={styles.form}>
        <View style={styles.field}>
          <Text style={textStyle.label}>Email</Text>
          <TextInput
            accessibilityLabel="Email"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            keyboardType="email-address"
            placeholder="nama@contoh.com"
            placeholderTextColor={color.muted}
            selectionColor={color.forest}
            editable={!busy}
            value={email}
            onChangeText={(value) => { setEmail(value); setNotice(''); }}
            style={[styles.input, errors.email && styles.invalid]}
          />
          {errors.email && <Text accessibilityLiveRegion="polite" style={styles.error}>{errors.email}</Text>}
        </View>

        <View style={styles.field}>
          <Text style={textStyle.label}>Kata sandi</Text>
          <View style={[styles.passwordBox, errors.password && styles.invalid]}>
            <TextInput
              accessibilityLabel="Kata sandi"
              autoCapitalize="none"
              autoComplete="current-password"
              autoCorrect={false}
              secureTextEntry={!visible}
              placeholder="Masukkan kata sandi"
              placeholderTextColor={color.muted}
              selectionColor={color.forest}
              editable={!busy}
              value={password}
              onChangeText={(value) => { setPassword(value); setNotice(''); }}
              onSubmitEditing={submit}
              returnKeyType="go"
              style={styles.passwordInput}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={visible ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
              disabled={busy}
              onPress={() => setVisible(!visible)}
              style={styles.passwordToggle}
            >
              <Icon name={visible ? 'eye-off' : 'eye'} size={19} />
            </Pressable>
          </View>
          {errors.password && <Text accessibilityLiveRegion="polite" style={styles.error}>{errors.password}</Text>}
        </View>

        <Button icon="arrow-right" onPress={submit} pending={busy}>
          {busy ? 'Sedang masuk…' : 'Masuk'}
        </Button>
        {!!message && <Text accessibilityRole="alert" style={styles.notice}>{message}</Text>}
      </View>
    </Page>
  );
}

const styles = StyleSheet.create({
  heading: { marginTop: 23, gap: 4 },
  form: { gap: 17, marginTop: 25 },
  field: { gap: 7 },
  input: { borderRadius: 12, borderWidth: 1, borderColor: color.line, backgroundColor: color.surface, minHeight: 50, paddingHorizontal: 13, color: color.ink, fontFamily: font.body, fontSize: 16 },
  passwordBox: { minHeight: 50, borderRadius: 12, borderWidth: 1, borderColor: color.line, backgroundColor: color.surface, flexDirection: 'row', alignItems: 'center' },
  passwordInput: { color: color.ink, fontFamily: font.body, fontSize: 16, paddingHorizontal: 13, minHeight: 48, flex: 1 },
  passwordToggle: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  invalid: { borderColor: color.error },
  error: { color: color.error, fontFamily: font.medium, fontSize: 13 },
  notice: { color: color.brown, fontFamily: font.medium, lineHeight: 20, fontSize: 14, backgroundColor: color.paleGold, padding: 12, borderRadius: 10, marginTop: 2 },
  profile: { marginVertical: 22, padding: 16, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: color.leaf },
  profileIcon: { padding: 8 },
  profileText: { flex: 1, gap: 3 },
});
