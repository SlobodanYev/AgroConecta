import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as Location from 'expo-location';
import { initialWindowMetrics, SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import StoreMap from './src/components/StoreMap';
import { CATEGORIES, STORES } from './src/data';
import {
  createForumPost,
  registerUser,
  signInUser,
  signOutUser,
  subscribePosts,
  subscribeSession,
} from './src/services/backend';
import { colors, shadows } from './src/theme';

const ROUTES = {
  home: ['AGROCONECTA', 'Inicio'],
  forum: ['COMUNIDAD', 'Consultas técnicas'],
  create: ['FORO TÉCNICO', 'Nueva consulta'],
  map: ['PUNTOS DE VENTA', 'Tiendas de insumos'],
  profile: ['CUENTA', 'Mi perfil'],
};

function roleLabel(role) {
  return role === 'Egresado' ? 'Egresado/a de Agronomía' : 'Agricultor/a';
}

function Field({ label, multiline = false, children, ...props }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children || (
        <TextInput
          {...props}
          accessibilityLabel={props.accessibilityLabel || label}
          multiline={multiline}
          placeholderTextColor="#89938C"
          style={[styles.input, multiline && styles.textarea]}
        />
      )}
    </View>
  );
}

function PrimaryButton({ children, onPress, disabled = false, secondary = false }) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        secondary ? styles.buttonSecondary : styles.buttonPrimary,
        disabled && styles.buttonDisabled,
        pressed && !disabled && styles.buttonPressed,
      ]}
    >
      <Text style={secondary ? styles.buttonSecondaryText : styles.buttonPrimaryText}>{children}</Text>
    </Pressable>
  );
}

function AuthScreen() {
  const [tab, setTab] = useState('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState('Agricultor');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [success, setSuccess] = useState(false);

  const submit = async () => {
    setMessage('');
    setSuccess(false);
    if (!email.trim() || !password) return setMessage('Completa correo y contraseña.');
    if (password.length < 8) return setMessage('La contraseña debe tener al menos 8 caracteres.');
    if (tab === 'register') {
      if (!name.trim()) return setMessage('Ingresa tu nombre completo.');
      if (password !== confirmPassword) return setMessage('Las contraseñas no coinciden.');
    }

    try {
      setBusy(true);
      if (tab === 'register') {
        await registerUser({ name: name.trim(), email: email.trim(), password, role });
        setTab('login');
        setPassword('');
        setConfirmPassword('');
        setShowPassword(false);
        setSuccess(true);
        setMessage('Cuenta creada correctamente. Ya puedes iniciar sesión.');
      } else {
        await signInUser({ email: email.trim(), password });
      }
    } catch (error) {
      setMessage(error.message || 'No fue posible completar la operación.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={[styles.flex, { backgroundColor: colors.green50 }]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={20}>
      <ScrollView contentContainerStyle={styles.authContainer} keyboardShouldPersistTaps="handled">
        <View style={styles.logoMark}><Text style={styles.logoLeaf}>⌁</Text></View>
        <Text style={styles.eyebrow}>AGRICULTURA CONECTADA</Text>
        <Text style={styles.authTitle}>AgroConecta</Text>
        <Text style={styles.authLead}>Una comunidad para compartir apoyo técnico y encontrar tiendas de insumos agrícolas en Arica.</Text>

        <View style={styles.segmented}>
          {[
            ['login', 'Ingresar'],
            ['register', 'Crear cuenta'],
          ].map(([value, label]) => (
            <Pressable
              key={value}
              accessibilityRole="tab"
              accessibilityState={{ selected: tab === value }}
              onPress={() => { setTab(value); setMessage(''); setSuccess(false); setPassword(''); setConfirmPassword(''); }}
              style={[styles.segment, tab === value && styles.segmentActive]}
            >
              <Text style={[styles.segmentText, tab === value && styles.segmentTextActive]}>{label}</Text>
            </Pressable>
          ))}
        </View>

        {tab === 'register' && (
          <>
            <Field label="Nombre completo" value={name} onChangeText={setName} placeholder="Tu nombre y apellido" />
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Rol en la plataforma</Text>
              <View style={styles.roleRow}>
                {[
                  ['Agricultor', 'Agricultor'],
                  ['Egresado', 'Egresado'],
                ].map(([value, label]) => (
                  <Pressable
                    key={value}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: role === value }}
                    onPress={() => setRole(value)}
                    style={[styles.roleChip, role === value && styles.roleChipActive]}
                  >
                    <Text style={[styles.roleChipText, role === value && styles.roleChipTextActive]}>{label}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </>
        )}

        <Field
          label="Correo electrónico"
          value={email}
          onChangeText={setEmail}
          placeholder="nombre@correo.cl"
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
        />
        <Field label="Contraseña">
          <View style={styles.passwordInputContainer}>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Mínimo 8 caracteres"
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              placeholderTextColor="#89938C"
              style={styles.passwordInput}
            />
            <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.passwordToggle}>
              <Text style={styles.passwordToggleText}>{showPassword ? 'Ocultar' : 'Ver'}</Text>
            </Pressable>
          </View>
        </Field>
        {tab === 'register' && (
          <Field label="Confirmar contraseña">
            <View style={styles.passwordInputContainer}>
              <TextInput
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Repite tu contraseña"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                placeholderTextColor="#89938C"
                style={styles.passwordInput}
              />
            </View>
          </Field>
        )}
        {!!message && <Text style={success ? styles.successText : styles.errorText}>{message}</Text>}
        <PrimaryButton onPress={submit} disabled={busy}>{busy ? 'Procesando…' : tab === 'login' ? 'Iniciar sesión' : 'Crear mi cuenta'}</PrimaryButton>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Header({ route, onHome }) {
  const [kicker, title] = ROUTES[route];
  return (
    <View style={styles.header}>
      <Pressable accessibilityRole="button" accessibilityLabel="Ir al inicio" onPress={onHome} style={styles.headerIcon}><Text style={styles.headerIconText}>⌂</Text></Pressable>
      <View style={styles.headerCenter}>
        <Text style={styles.headerKicker}>{kicker}</Text>
        <Text style={styles.headerTitle}>{title}</Text>
      </View>
      <View accessibilityElementsHidden style={styles.headerBrand}><Text style={styles.headerBrandText}>♧</Text></View>
    </View>
  );
}

function PostCard({ post, compact = false }) {
  const date = post.createdAt ? new Date(post.createdAt) : new Date();
  return (
    <View style={styles.postCard}>
      <View style={styles.postMeta}>
        <Text style={styles.tag}>{post.category}</Text>
        <Text style={styles.metaText}>{post.authorName || 'Usuario'} · {date.toLocaleDateString('es-CL')}</Text>
      </View>
      <Text style={styles.postTitle}>{post.title}</Text>
      {!compact && <Text style={styles.postDescription}>{post.description}</Text>}
    </View>
  );
}

function HomeScreen({ user, posts, navigate }) {
  return (
    <ScrollView contentContainerStyle={styles.screenContent}>
      <View style={styles.heroCard}>
        <View style={styles.heroCopy}>
          <Text style={styles.heroKicker}>Bienvenido,</Text>
          <Text style={styles.heroTitle}>{user.name?.split(' ')[0] || 'Agricultor'}</Text>
          <Text style={styles.heroText}>{user.role === 'Egresado' ? 'Revisa las consultas técnicas de la comunidad.' : 'Encuentra apoyo para tus cultivos y puntos de venta de la zona.'}</Text>
        </View>
        <Text style={styles.heroArt}>♧</Text>
      </View>

      <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Accesos rápidos</Text></View>
      <View style={styles.quickGrid}>
        {user.role === 'Agricultor' && <QuickCard icon="＋" label="Crear consulta" sub="Publica una duda" onPress={() => navigate('create')} />}
        <QuickCard icon="◌" label="Foro técnico" sub="Revisa las consultas" onPress={() => navigate('forum')} />
        <QuickCard icon="⌖" label="Mapa" sub="Ubica puntos de venta" onPress={() => navigate('map')} />
      </View>

      <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Consultas recientes</Text><Pressable accessibilityRole="button" accessibilityLabel="Ver todas las consultas" onPress={() => navigate('forum')}><Text style={styles.textLinkInline}>Ver todas</Text></Pressable></View>
      {posts.slice(0, 2).map((post) => <PostCard key={post.id} post={post} compact />)}
      {!posts.length && <EmptyState text="Todavía no hay consultas. Publica la primera." />}
    </ScrollView>
  );
}

function QuickCard({ icon, label, sub, onPress }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${label}. ${sub}`} onPress={onPress} style={styles.quickCard}>
      <View style={styles.quickIcon}><Text style={styles.quickIconText}>{icon}</Text></View>
      <Text style={styles.quickLabel}>{label}</Text>
      <Text style={styles.quickSub}>{sub}</Text>
    </Pressable>
  );
}

function EmptyState({ text }) {
  return <View style={styles.emptyState}><Text style={styles.emptyIcon}>✓</Text><Text style={styles.emptyText}>{text}</Text></View>;
}

function ForumScreen({ user, posts, navigate }) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('Todas');
  const categories = useMemo(() => ['Todas', ...new Set(posts.map((post) => post.category))], [posts]);
  const filtered = posts.filter((post) => {
    const matchesCategory = category === 'Todas' || post.category === category;
    const text = `${post.title} ${post.description} ${post.category}`.toLowerCase();
    return matchesCategory && text.includes(query.trim().toLowerCase());
  });

  return (
    <View style={styles.flex}>
      <ScrollView contentContainerStyle={styles.screenContent} keyboardShouldPersistTaps="handled">
        <TextInput accessibilityLabel="Buscar consultas en el foro" style={styles.searchInput} placeholder="⌕  Buscar en el foro" placeholderTextColor="#77847B" value={query} onChangeText={setQuery} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
          {categories.map((item) => (
            <Pressable key={item} accessibilityRole="button" accessibilityState={{ selected: category === item }} onPress={() => setCategory(item)} style={[styles.filterChip, category === item && styles.filterChipActive]}>
              <Text style={[styles.filterChipText, category === item && styles.filterChipTextActive]}>{item}</Text>
            </Pressable>
          ))}
        </ScrollView>
        {filtered.map((post) => <PostCard key={post.id} post={post} />)}
        {!filtered.length && <EmptyState text="No se encontraron consultas." />}
      </ScrollView>
      {user.role === 'Agricultor' && <View style={styles.stickyButton}><PrimaryButton onPress={() => navigate('create')}>＋ Nueva consulta</PrimaryButton></View>}
    </View>
  );
}

function CreateScreen({ user, navigate }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const publish = async () => {
    setMessage('');
    if (!title.trim()) return setMessage('Escribe un título.');
    if (!description.trim()) return setMessage('Describe el problema.');
    if (!category) return setMessage('Selecciona un cultivo o tipo de problema.');
    try {
      setBusy(true);
      await createForumPost({ title: title.trim(), description: description.trim(), category, user });
      setTitle(''); setDescription(''); setCategory('');
      navigate('forum');
    } catch (error) {
      setMessage(error.message || 'No fue posible publicar.');
    } finally {
      setBusy(false);
    }
  };

  if (user.role !== 'Agricultor') {
    return <View style={styles.screenContent}><EmptyState text="Solo las cuentas de agricultor pueden publicar consultas." /></View>;
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.screenContent} keyboardShouldPersistTaps="handled">
        <View style={styles.stepHeading}><View style={styles.flex}><Text style={styles.stepTitle}>Cuéntanos qué ocurre en tu cultivo</Text><Text style={styles.stepSub}>Completa el título, la descripción y la categoría.</Text></View></View>
        <Field label="Título de la consulta *" value={title} onChangeText={setTitle} placeholder="Ej.: Manchas en hojas de tomate" maxLength={80} />
        <Field label="Descripción del problema *" value={description} onChangeText={setDescription} placeholder="Describe qué observaste, desde cuándo y qué tratamiento has probado…" maxLength={600} multiline />
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Cultivo o tipo de problema *</Text>
          <View style={styles.categoryGrid}>
            {CATEGORIES.map((item) => (
              <Pressable key={item} accessibilityRole="radio" accessibilityState={{ checked: category === item }} onPress={() => setCategory(item)} style={[styles.categoryChoice, category === item && styles.categoryChoiceActive]}>
                <Text style={[styles.categoryChoiceText, category === item && styles.categoryChoiceTextActive]}>{item}</Text>
              </Pressable>
            ))}
          </View>
        </View>
        <View style={styles.pendingCard}><Text style={styles.pendingIcon}>▧</Text><View style={styles.flex}><Text style={styles.pendingTitle}>Fotografías</Text><Text style={styles.pendingText}>Esta opción se agregará en una próxima versión.</Text></View></View>
        {!!message && <Text style={styles.errorText}>{message}</Text>}
        <View style={styles.buttonRow}><View style={styles.buttonHalf}><PrimaryButton secondary onPress={() => navigate('forum')}>Cancelar</PrimaryButton></View><View style={styles.buttonWide}><PrimaryButton onPress={publish} disabled={busy}>{busy ? 'Publicando…' : 'Publicar consulta'}</PrimaryButton></View></View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function MapScreen() {
  const [selected, setSelected] = useState(STORES[0]);
  const [region, setRegion] = useState({ latitude: -18.4883, longitude: -70.2927, latitudeDelta: 0.2, longitudeDelta: 0.2 });
  const [userLocation, setUserLocation] = useState(null);
  const [message, setMessage] = useState(`${STORES[0].name}: ${STORES[0].address}`);

  const selectStore = (store) => {
    setSelected(store);
    setRegion({ latitude: store.latitude, longitude: store.longitude, latitudeDelta: 0.08, longitudeDelta: 0.08 });
    setMessage(`${store.name}: ${store.address}`);
  };

  const locate = async () => {
    try {
      setMessage('Solicitando permiso de ubicación…');
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) return setMessage('No pudimos usar tu ubicación. Puedes activar el permiso en la configuración del teléfono.');
      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const current = { latitude: location.coords.latitude, longitude: location.coords.longitude };
      setUserLocation(current);
      setRegion({ ...current, latitudeDelta: 0.08, longitudeDelta: 0.08 });
      setMessage('Mapa centrado en tu ubicación actual.');
    } catch {
      setMessage('No pudimos obtener tu ubicación. Revisa que la ubicación del teléfono esté activada.');
    }
  };

  const openRoute = async () => {
    const destination = `${selected.latitude},${selected.longitude}`;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}&travelmode=driving`;
    try {
      await Linking.openURL(url);
    } catch {
      setMessage('No fue posible abrir Google Maps. Verifica que el dispositivo tenga conexión a internet.');
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.screenContent}>
      <StoreMap region={region} stores={STORES} selectedId={selected.id} userLocation={userLocation} onSelect={selectStore} />
      <View style={styles.mapToolbar}><View style={styles.flex}><Text style={styles.sectionTitle}>Puntos de venta</Text><Text style={styles.mapSub}>Arica y los valles de Azapa y Lluta</Text></View><Pressable accessibilityRole="button" accessibilityLabel="Centrar mapa en mi ubicación" onPress={locate} style={styles.locateButton}><Text style={styles.locateText}>⌖ Mi ubicación</Text></Pressable></View>
      <Text style={styles.mapMessage}>{message}</Text>
      <View style={styles.routeCard}>
        <View style={styles.flex}><Text style={styles.routeTitle}>{selected.name}</Text><Text style={styles.routeAddress}>{selected.address}</Text></View>
        <Pressable accessibilityRole="link" onPress={openRoute} style={styles.routeButton}><Text style={styles.routeButtonText}>Cómo llegar ↗</Text></Pressable>
      </View>
      {STORES.map((store) => (
        <Pressable key={store.id} accessibilityRole="button" accessibilityLabel={`${store.name}. ${store.address}`} accessibilityState={{ selected: selected.id === store.id }} onPress={() => selectStore(store)} style={[styles.storeCard, selected.id === store.id && styles.storeCardActive]}>
          <View style={styles.storePin}><Text style={styles.storePinText}>●</Text></View>
          <View style={styles.flex}><Text style={styles.storeName}>{store.name}</Text><Text style={styles.storeAddress}>{store.address}</Text></View>
          <Text style={styles.chevron}>›</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

function ProfileScreen({ user }) {
  return (
    <ScrollView contentContainerStyle={styles.screenContent}>
      <View style={styles.profileCard}>
        <View style={styles.avatar}><Text style={styles.avatarText}>{user.name?.charAt(0)?.toUpperCase() || 'A'}</Text></View>
        <Text style={styles.profileName}>{user.name}</Text>
        <Text style={styles.profileRole}>{roleLabel(user.role)}</Text>
        <Text style={styles.profileEmail}>{user.email}</Text>
      </View>
      <View style={styles.sessionCard}><View style={styles.onlineDot} /><View style={styles.flex}><Text style={styles.sessionTitle}>Sesión activa</Text><Text style={styles.sessionText}>Tu cuenta permanecerá iniciada en este dispositivo.</Text></View></View>
      <PrimaryButton secondary onPress={signOutUser}>Cerrar sesión</PrimaryButton>
    </ScrollView>
  );
}

function BottomNav({ route, navigate, user }) {
  const items = [
    ['home', '⌂', 'Inicio'],
    ['forum', '◌', 'Foro'],
    ...(user.role === 'Agricultor' ? [['create', '＋', 'Crear']] : []),
    ['map', '⌖', 'Mapa'],
    ['profile', '♙', 'Perfil'],
  ];
  return (
    <View style={styles.bottomNav}>
      {items.map(([value, icon, label]) => (
        <Pressable key={value} accessibilityRole="tab" accessibilityLabel={label} accessibilityState={{ selected: route === value }} onPress={() => navigate(value)} style={[styles.navItem, route === value && styles.navItemActive]}>
          <Text style={[styles.navIcon, value === 'create' && styles.navCreate]}>{icon}</Text>
          <Text style={[styles.navLabel, route === value && styles.navLabelActive]}>{label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function MainApp({ user }) {
  const [route, setRoute] = useState('home');
  const [posts, setPosts] = useState([]);

  useEffect(() => subscribePosts(setPosts, (error) => Alert.alert('Foro', error.message)), []);
  const navigate = (next) => setRoute(next);

  return (
    <SafeAreaView style={styles.app}>
      <StatusBar style="dark" />
      <Header route={route} onHome={() => navigate('home')} />
      <View style={styles.mainArea}>
        {route === 'home' && <HomeScreen user={user} posts={posts} navigate={navigate} />}
        {route === 'forum' && <ForumScreen user={user} posts={posts} navigate={navigate} />}
        {route === 'create' && <CreateScreen user={user} navigate={navigate} />}
        {route === 'map' && <MapScreen />}
        {route === 'profile' && <ProfileScreen user={user} />}
      </View>
      <BottomNav route={route} navigate={navigate} user={user} />
    </SafeAreaView>
  );
}

export default function App() {
  const [user, setUser] = useState(undefined);
  useEffect(() => subscribeSession(setUser), []);
  let content;
  if (user === undefined) {
    content = <SafeAreaView style={styles.loading}><ActivityIndicator color={colors.green700} size="large" /><Text style={styles.loadingText}>Preparando AgroConecta…</Text></SafeAreaView>;
  } else {
    content = user ? <MainApp user={user} /> : <SafeAreaView style={styles.app}><StatusBar style="dark" /><AuthScreen /></SafeAreaView>;
  }
  return <SafeAreaProvider initialMetrics={initialWindowMetrics}>{content}</SafeAreaProvider>;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  app: { flex: 1, backgroundColor: colors.white },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.green50 },
  loadingText: { marginTop: 14, color: colors.muted, fontWeight: '600' },
  authContainer: { flexGrow: 1, paddingHorizontal: 26, paddingTop: 38, paddingBottom: 34, backgroundColor: colors.green50 },
  logoMark: { width: 72, height: 72, borderRadius: 22, backgroundColor: colors.green800, alignItems: 'center', justifyContent: 'center', ...shadows.medium },
  logoLeaf: { color: colors.white, fontSize: 42, fontWeight: '800', transform: [{ rotate: '-30deg' }] },
  eyebrow: { marginTop: 22, color: colors.green700, fontSize: 11, letterSpacing: 1.6, fontWeight: '800' },
  authTitle: { marginTop: 4, color: colors.green900, fontSize: 38, lineHeight: 44, fontWeight: '900' },
  authLead: { marginTop: 10, marginBottom: 24, color: colors.muted, fontSize: 15, lineHeight: 22 },
  segmented: { flexDirection: 'row', padding: 4, borderRadius: 14, backgroundColor: '#E8EEE8', marginBottom: 18 },
  segment: { flex: 1, paddingVertical: 11, alignItems: 'center', borderRadius: 11 },
  segmentActive: { backgroundColor: colors.white, ...shadows.small },
  segmentText: { color: colors.muted, fontWeight: '700' },
  segmentTextActive: { color: colors.green800 },
  field: { marginBottom: 14 },
  fieldLabel: { color: '#284331', fontSize: 13, fontWeight: '800', marginBottom: 7 },
  input: { minHeight: 50, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white, borderRadius: 13, paddingHorizontal: 14, color: colors.ink, fontSize: 15 },
  passwordInputContainer: { flexDirection: 'row', alignItems: 'center', minHeight: 50, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white, borderRadius: 13, paddingRight: 8 },
  passwordInput: { flex: 1, minHeight: 50, paddingHorizontal: 14, color: colors.ink, fontSize: 15 },
  passwordToggle: { paddingHorizontal: 12, paddingVertical: 8, backgroundColor: colors.green50, borderRadius: 8 },
  passwordToggleText: { color: colors.green800, fontSize: 13, fontWeight: '800' },
  textarea: { height: 132, textAlignVertical: 'top', paddingTop: 14 },
  roleRow: { flexDirection: 'row', gap: 8 },
  roleChip: { flex: 1, minHeight: 54, borderWidth: 1, borderColor: colors.line, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white },
  roleChipActive: { backgroundColor: colors.green100, borderColor: colors.green600 },
  roleChipText: { color: colors.muted, fontSize: 13, lineHeight: 17, fontWeight: '700', textAlign: 'center' },
  roleChipTextActive: { color: colors.green800 },
  errorText: { color: colors.red, fontSize: 12, lineHeight: 18, marginBottom: 10 },
  successText: { color: colors.green700, fontSize: 12, lineHeight: 18, marginBottom: 10, fontWeight: '700' },
  button: { minHeight: 50, borderRadius: 13, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  buttonPrimary: { backgroundColor: colors.green700, ...shadows.small },
  buttonSecondary: { backgroundColor: colors.green50, borderWidth: 1, borderColor: '#CFE0D2' },
  buttonDisabled: { opacity: 0.55 },
  buttonPressed: { transform: [{ scale: 0.99 }], opacity: 0.9 },
  buttonPrimaryText: { color: colors.white, fontWeight: '900', fontSize: 15 },
  buttonSecondaryText: { color: colors.green800, fontWeight: '900', fontSize: 15 },
  header: { height: 72, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: colors.line, paddingHorizontal: 14, backgroundColor: colors.white },
  headerIcon: { width: 42, height: 42, borderRadius: 12, backgroundColor: colors.green50, alignItems: 'center', justifyContent: 'center' },
  headerIconText: { fontSize: 21, color: colors.green800, fontWeight: '800' },
  headerBrand: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  headerBrandText: { fontSize: 25, color: colors.green700, fontWeight: '800' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerKicker: { color: colors.green700, fontSize: 10, letterSpacing: 1.2, fontWeight: '900' },
  headerTitle: { color: colors.green900, fontSize: 18, fontWeight: '900', marginTop: 2 },
  mainArea: { flex: 1, backgroundColor: '#FBFDFB' },
  screenContent: { padding: 16, paddingBottom: 28 },
  heroCard: { minHeight: 174, padding: 22, borderRadius: 24, overflow: 'hidden', backgroundColor: '#EEF5E8', flexDirection: 'row', ...shadows.small },
  heroCopy: { width: '70%', zIndex: 2 },
  heroKicker: { color: colors.green700, fontWeight: '900', marginBottom: 4 },
  heroTitle: { color: colors.green900, fontSize: 27, fontWeight: '900' },
  heroText: { color: '#47614F', fontSize: 13, lineHeight: 19, marginTop: 10 },
  heroArt: { position: 'absolute', right: -8, bottom: -32, fontSize: 160, color: '#A9D1AF', transform: [{ rotate: '-22deg' }] },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 22, marginBottom: 11 },
  sectionTitle: { color: colors.ink, fontSize: 17, fontWeight: '900' },
  quickGrid: { flexDirection: 'row', gap: 9 },
  quickCard: { flex: 1, minHeight: 136, borderWidth: 1, borderColor: colors.line, borderRadius: 16, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center', padding: 9, ...shadows.small },
  quickIcon: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.green100, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  quickIconText: { color: colors.green700, fontSize: 24, fontWeight: '700' },
  quickLabel: { color: colors.ink, fontSize: 13, lineHeight: 17, fontWeight: '900', textAlign: 'center' },
  quickSub: { color: colors.muted, fontSize: 11, lineHeight: 15, textAlign: 'center', marginTop: 4 },
  textLinkInline: { color: colors.green700, fontSize: 13, fontWeight: '800' },
  postCard: { borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white, borderRadius: 16, padding: 14, marginBottom: 10, ...shadows.small },
  postMeta: { flexDirection: 'row', alignItems: 'center', gap: 7, flexWrap: 'wrap' },
  tag: { color: colors.green800, backgroundColor: colors.green100, borderRadius: 99, paddingVertical: 5, paddingHorizontal: 9, fontSize: 11, fontWeight: '900' },
  metaText: { color: colors.muted, fontSize: 11 },
  postTitle: { color: colors.green900, fontSize: 16, fontWeight: '900', marginTop: 8 },
  postDescription: { color: '#536158', fontSize: 13, lineHeight: 19, marginTop: 7 },
  searchInput: { height: 48, borderWidth: 1, borderColor: colors.line, borderRadius: 13, backgroundColor: colors.white, paddingHorizontal: 14, color: colors.ink },
  chipsRow: { gap: 7, paddingVertical: 13 },
  filterChip: { borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white, borderRadius: 99, paddingVertical: 10, paddingHorizontal: 14 },
  filterChipActive: { borderColor: '#B9D6BE', backgroundColor: colors.green100 },
  filterChipText: { color: colors.muted, fontSize: 13, fontWeight: '800' },
  filterChipTextActive: { color: colors.green800 },
  emptyState: { borderWidth: 1, borderColor: colors.line, borderRadius: 15, backgroundColor: colors.white, padding: 18, alignItems: 'center', marginTop: 10 },
  emptyIcon: { width: 32, height: 32, textAlign: 'center', textAlignVertical: 'center', borderRadius: 16, backgroundColor: colors.green100, color: colors.green700, fontSize: 18 },
  emptyText: { color: colors.muted, textAlign: 'center', marginTop: 8 },
  stickyButton: { paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.line, backgroundColor: colors.white },
  stepHeading: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  stepTitle: { color: colors.ink, fontSize: 18, lineHeight: 23, fontWeight: '900' },
  stepSub: { color: colors.muted, fontSize: 13, lineHeight: 18, marginTop: 4 },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryChoice: { borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white, borderRadius: 99, paddingHorizontal: 13, paddingVertical: 9 },
  categoryChoiceActive: { backgroundColor: colors.green100, borderColor: colors.green600 },
  categoryChoiceText: { color: colors.muted, fontSize: 12, fontWeight: '700' },
  categoryChoiceTextActive: { color: colors.green800 },
  pendingCard: { flexDirection: 'row', gap: 12, alignItems: 'center', padding: 14, borderWidth: 1, borderStyle: 'dashed', borderColor: '#B8CBBB', backgroundColor: colors.green50, borderRadius: 13, marginBottom: 14 },
  pendingIcon: { color: colors.green700, fontSize: 24 },
  pendingTitle: { color: colors.green800, fontWeight: '900' },
  pendingText: { color: colors.muted, fontSize: 13, lineHeight: 18, marginTop: 3 },
  buttonRow: { flexDirection: 'row', gap: 9 },
  buttonHalf: { flex: 0.8 },
  buttonWide: { flex: 1.2 },
  mapToolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 },
  mapSub: { color: colors.muted, fontSize: 13, lineHeight: 18, marginTop: 3 },
  locateButton: { minHeight: 44, borderWidth: 1, borderColor: '#CFE0D2', backgroundColor: colors.green50, borderRadius: 11, paddingHorizontal: 12, paddingVertical: 11, marginLeft: 10, justifyContent: 'center' },
  locateText: { color: colors.green800, fontSize: 12, fontWeight: '900' },
  mapMessage: { minHeight: 34, color: colors.muted, fontSize: 13, lineHeight: 18, marginVertical: 10 },
  routeCard: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 14, backgroundColor: colors.green800, padding: 13, marginBottom: 11 },
  routeTitle: { color: colors.white, fontWeight: '900', fontSize: 15 },
  routeAddress: { color: '#D9EADF', fontSize: 12, lineHeight: 17, marginTop: 3 },
  routeButton: { minHeight: 44, borderRadius: 10, backgroundColor: colors.white, paddingHorizontal: 12, paddingVertical: 11, justifyContent: 'center' },
  routeButtonText: { color: colors.green800, fontWeight: '900', fontSize: 12 },
  storeCard: { flexDirection: 'row', alignItems: 'center', gap: 11, borderWidth: 1, borderColor: colors.line, borderRadius: 14, backgroundColor: colors.white, padding: 12, marginBottom: 9 },
  storeCardActive: { borderColor: colors.green600, backgroundColor: colors.green50 },
  storePin: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.green700, alignItems: 'center', justifyContent: 'center' },
  storePinText: { color: colors.white },
  storeName: { color: colors.ink, fontSize: 15, fontWeight: '900' },
  storeAddress: { color: colors.muted, fontSize: 13, lineHeight: 18, marginTop: 3 },
  chevron: { color: colors.green700, fontSize: 26 },
  profileCard: { alignItems: 'center', borderWidth: 1, borderColor: colors.line, borderRadius: 22, padding: 28, backgroundColor: colors.green50 },
  avatar: { width: 76, height: 76, borderRadius: 24, backgroundColor: colors.green700, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  avatarText: { color: colors.white, fontSize: 34, fontWeight: '900' },
  profileName: { color: colors.green900, fontSize: 21, fontWeight: '900' },
  profileRole: { color: colors.green700, fontWeight: '800', marginTop: 4 },
  profileEmail: { color: colors.muted, marginTop: 5 },
  sessionCard: { flexDirection: 'row', alignItems: 'center', gap: 13, borderWidth: 1, borderColor: colors.line, borderRadius: 14, padding: 15, backgroundColor: colors.white, marginVertical: 14 },
  onlineDot: { width: 13, height: 13, borderRadius: 7, backgroundColor: '#27A653' },
  sessionTitle: { color: colors.ink, fontWeight: '900' },
  sessionText: { color: colors.muted, fontSize: 13, lineHeight: 18, marginTop: 3 },
  bottomNav: { minHeight: 72, flexDirection: 'row', alignItems: 'stretch', borderTopWidth: 1, borderTopColor: colors.line, backgroundColor: colors.white, ...shadows.nav },
  navItem: { flex: 1, alignItems: 'center', justifyContent: 'center', borderTopWidth: 3, borderTopColor: 'transparent' },
  navItemActive: { borderTopColor: colors.green600 },
  navIcon: { color: '#858E87', fontSize: 21, lineHeight: 25 },
  navCreate: { width: 32, height: 32, borderRadius: 16, textAlign: 'center', textAlignVertical: 'center', overflow: 'hidden', color: colors.white, backgroundColor: colors.green600 },
  navLabel: { color: '#727B74', fontSize: 11, fontWeight: '800', marginTop: 2 },
  navLabelActive: { color: colors.green700 },
});
