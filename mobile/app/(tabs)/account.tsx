import { useState } from 'react';
import { Keyboard, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { validateLogin } from '../../src/loginValidation';
import { Brand, Button, color, font, Icon, Page, textStyle } from '../../src/ui';

export default function AccountScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [visible, setVisible] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [validSubmission, setValidSubmission] = useState(false);
  const errors = attempted ? validateLogin(email, password) : {};

  function submit() {
    if (Object.keys(validateLogin(email, password)).length) {
      setAttempted(true);
      setValidSubmission(false);
      return;
    }

    Keyboard.dismiss();
    setAttempted(false);
    setValidSubmission(true);
    setPassword('');
    setVisible(false);
  }

  return (
    <Page>
      <Brand />
      <View style={styles.heading}>
        <Text accessibilityRole="header" style={textStyle.title}>Masuk</Text>
        <Text style={textStyle.supporting}>Layanan akun belum aktif. Anda tetap bisa menjelajahi katalog.</Text>
      </View>

      <View style={styles.form}>
        <View style={styles.field}>
          <Text style={textStyle.label}>Email</Text>
          <TextInput
            accessibilityLabel="Email"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="off"
            keyboardType="email-address"
            placeholder="nama@contoh.com"
            placeholderTextColor={color.muted}
            selectionColor={color.forest}
            value={email}
            onChangeText={(value) => { setEmail(value); setValidSubmission(false); }}
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
              autoComplete="off"
              autoCorrect={false}
              secureTextEntry={!visible}
              placeholder="Masukkan kata sandi"
              placeholderTextColor={color.muted}
              selectionColor={color.forest}
              value={password}
              onChangeText={(value) => { setPassword(value); setValidSubmission(false); }}
              onSubmitEditing={submit}
              returnKeyType="go"
              style={styles.passwordInput}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={visible ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
              onPress={() => setVisible(!visible)}
              style={styles.passwordToggle}
            >
              <Icon name={visible ? 'eye-off' : 'eye'} size={19} />
            </Pressable>
          </View>
          {errors.password && <Text accessibilityLiveRegion="polite" style={styles.error}>{errors.password}</Text>}
        </View>

        <Button icon="arrow-right" onPress={submit}>Masuk</Button>
        {validSubmission && (
          <Text accessibilityRole="alert" style={styles.notice}>Form valid. Layanan login belum terhubung, jadi data tidak dikirim.</Text>
        )}
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
  notice: { color: color.brown, fontFamily: font.medium, lineHeight: 20, fontSize: 14, backgroundColor: color.paleGold, padding: 12, borderRadius: 10 },
});
