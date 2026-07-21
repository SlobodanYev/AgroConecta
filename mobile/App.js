import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { initialWindowMetrics, SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import StoreMap from './src/components/StoreMap';
import { CATEGORIES, STORES } from './src/data';
import {
  createReply,
  createForumPost,
  registerUser,
  reviewGraduateProfile,
  signInUser,
  signOutUser,
  submitGraduateProfile,
  subscribeApprovedGraduates,
  subscribePostImages,
  subscribePendingGraduates,
  subscribeReplies,
  subscribePosts,
  subscribeSession,
} from './src/services/backend';
import { prepareForumImage } from './src/services/images';
import { colors, shadows } from './src/theme';

const ROUTES = {
  home: ['AGROCONECTA', 'Inicio'],
  forum: ['COMUNIDAD', 'Consultas técnicas'],
  postDetail: ['FORO TÉCNICO', 'Detalle de consulta'],
  create: ['FORO TÉCNICO', 'Nueva consulta'],
  graduates: ['EGRESADOS', 'Directorio'],
  map: ['PUNTOS DE VENTA', 'Tiendas de insumos'],
  profile: ['CUENTA', 'Mi perfil'],
};

function roleLabel(role) {
  if (role === 'Administrador') return 'Administrador/a';
  return role === 'Egresado' ? 'Cuenta de egresado/a' : 'Agricultor/a';
}

function normalizeChileanRut(value = '') {
  return value.replace(/[.\s]/g, '').toUpperCase();
}

function isValidChileanRut(value) {
  const match = normalizeChileanRut(value).match(/^(\d{7,8})-([0-9K])$/);
  if (!match) return false;
  const [, body, verifier] = match;
  let sum = 0;
  let multiplier = 2;
  for (let index = body.length - 1; index >= 0; index -= 1) {
    sum += Number(body[index]) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }
  const result = 11 - (sum % 11);
  const expected = result === 11 ? '0' : result === 10 ? 'K' : String(result);
  return verifier === expected;
}

function formatChileanRut(value) {
  const normalized = normalizeChileanRut(value);
  const [body, verifier] = normalized.split('-');
  if (!body || !verifier) return normalized || 'No informado';
  return `${body.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}-${verifier}`;
}

function Field({ label, multiline = false, disabled = false, children, ...props }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children || (
        <TextInput
          {...props}
          accessibilityLabel={props.accessibilityLabel || label}
          editable={!disabled && props.editable !== false}
          multiline={multiline}
          placeholderTextColor="#89938C"
          style={[styles.input, multiline && styles.textarea, disabled && styles.inputDisabled]}
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
              {role === 'Egresado' && <Text style={styles.formHelp}>La cuenta deberá ser revisada antes de aparecer como egresado validado.</Text>}
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

function ImageViewer({ uri, visible, onClose }) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.imageViewerOverlay}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Cerrar imagen"
          onPress={onClose}
          style={styles.imageViewerClose}
        >
          <Text style={styles.imageViewerCloseText}>×</Text>
        </Pressable>
        {!!uri && <Image source={{ uri }} style={styles.imageViewerImage} resizeMode="contain" />}
        <Text style={styles.imageViewerHint}>Presiona la X para cerrar</Text>
      </View>
    </Modal>
  );
}

function PostCard({ post, images, compact = false, onPress }) {
  const [selectedImage, setSelectedImage] = useState(null);
  const [previewImages, setPreviewImages] = useState([]);
  const imageSources = (images ?? previewImages).map((image) => image.dataUrl);
  const date = post.createdAt ? new Date(post.createdAt) : new Date();
  const Container = onPress ? Pressable : View;
  const cardProps = onPress ? { accessibilityRole: 'button', onPress } : {};

  useEffect(() => {
    if (images !== undefined || !post.id || !post.imageCount) {
      setPreviewImages([]);
      return undefined;
    }
    return subscribePostImages(post.id, setPreviewImages, () => setPreviewImages([]));
  }, [images, post.id, post.imageCount]);

  return (
    <Container {...cardProps} style={styles.postCard}>
      <View style={styles.postMeta}>
        <Text style={styles.tag}>{post.category}</Text>
        <Text style={styles.metaText}>{post.authorName || 'Usuario'} · {date.toLocaleDateString('es-CL')}</Text>
      </View>
      <Text style={styles.postTitle}>{post.title}</Text>
      {!compact && <Text style={styles.postDescription}>{post.description}</Text>}

      {!!imageSources.length && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.postImagesRow}>
          {imageSources.map((uri, index) => (
            <Pressable
              key={`${uri}-${index}`}
              accessibilityRole="imagebutton"
              accessibilityLabel={`Abrir fotografía ${index + 1}`}
              onPress={(event) => {
                event.stopPropagation?.();
                setSelectedImage(uri);
              }}
              style={styles.postImageButton}
            >
              <Image source={{ uri }} style={styles.postImage} />
              <View style={styles.expandImageBadge}>
                <Text style={styles.expandImageBadgeText}>⛶</Text>
              </View>
            </Pressable>
          ))}
        </ScrollView>
      )}
      {onPress && <Text style={styles.openPostHint}>Ver respuestas ›</Text>}

      <ImageViewer
        uri={selectedImage}
        visible={Boolean(selectedImage)}
        onClose={() => setSelectedImage(null)}
      />
    </Container>
  );
}

function HomeScreen({ user, posts, navigate, openPost }) {
  return (
    <ScrollView contentContainerStyle={styles.screenContent}>
      <View style={styles.heroCard}>
        <View style={styles.heroCopy}>
          <Text style={styles.heroKicker}>Bienvenido,</Text>
          <Text style={styles.heroTitle}>{user.name?.split(' ')[0] || 'Agricultor'}</Text>
          <Text style={styles.heroText}>{user.role === 'Administrador' ? 'Revisa las solicitudes de validación pendientes.' : user.role === 'Egresado' ? 'Revisa las consultas de la comunidad.' : 'Encuentra apoyo para tus cultivos y puntos de venta de la zona.'}</Text>
        </View>
        <Text style={styles.heroArt}>♧</Text>
      </View>

      <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Accesos rápidos</Text></View>
      <View style={styles.quickGrid}>
        {user.role === 'Agricultor' && <QuickCard icon="＋" label="Crear consulta" sub="Publica una duda" onPress={() => navigate('create')} />}
        <QuickCard icon="◌" label="Foro técnico" sub="Revisa las consultas" onPress={() => navigate('forum')} />
        <QuickCard icon="♙" label="Egresados" sub="Busca apoyo" onPress={() => navigate('graduates')} />
        <QuickCard icon="⌖" label="Mapa" sub="Ubica puntos de venta" onPress={() => navigate('map')} />
      </View>

      <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Consultas recientes</Text><Pressable accessibilityRole="button" accessibilityLabel="Ver todas las consultas" onPress={() => navigate('forum')}><Text style={styles.textLinkInline}>Ver todas</Text></Pressable></View>
      {posts.slice(0, 2).map((post) => <PostCard key={post.id} post={post} compact onPress={() => openPost(post)} />)}
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

function ForumScreen({ user, posts, navigate, openPost }) {
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
        {filtered.map((post) => <PostCard key={post.id} post={post} onPress={() => openPost(post)} />)}
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
  const [images, setImages] = useState([]);
  const [processingImages, setProcessingImages] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const addAssets = async (assets) => {
    const available = 3 - images.length;
    if (available <= 0) return;
    try {
      setProcessingImages(true);
      const prepared = [];
      for (const asset of assets.slice(0, available)) {
        prepared.push(await prepareForumImage(asset.uri));
      }
      setImages((current) => [...current, ...prepared].slice(0, 3));
    } catch (error) {
      Alert.alert('Fotografía', error.message || 'No fue posible preparar la fotografía.');
    } finally {
      setProcessingImages(false);
    }
  };

  const chooseFromGallery = async () => {
    if (images.length >= 3) {
      Alert.alert('Límite alcanzado', 'Solo puedes adjuntar hasta 3 fotografías.');
      return;
    }
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permiso requerido', 'Debes permitir el acceso a la galería.');
        return;
      }
      const available = 3 - images.length;
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        selectionLimit: available,
        quality: 1,
      });
      if (!result.canceled) await addAssets(result.assets);
    } catch {
      Alert.alert('Galería', 'No fue posible abrir la galería del dispositivo.');
    }
  };

  const takePhoto = async () => {
    if (images.length >= 3) {
      Alert.alert('Límite alcanzado', 'Solo puedes adjuntar hasta 3 fotografías.');
      return;
    }
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permiso requerido', 'Debes permitir el acceso a la cámara.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 1 });
      if (!result.canceled) await addAssets(result.assets);
    } catch {
      Alert.alert('Cámara', 'No fue posible abrir la cámara del dispositivo.');
    }
  };

  const publish = async () => {
    setMessage('');
    if (!title.trim()) return setMessage('Escribe un título.');
    if (!description.trim()) return setMessage('Describe el problema.');
    if (!category) return setMessage('Selecciona un cultivo o tipo de problema.');
    if (processingImages) return setMessage('Espera a que las fotografías terminen de procesarse.');
    try {
      setBusy(true);
      await createForumPost({ title: title.trim(), description: description.trim(), category, images: images.map((image) => image.dataUrl), user });
      setTitle(''); setDescription(''); setCategory(''); setImages([]);
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
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Fotografías ({images.length}/3)</Text>
          <Text style={styles.pendingText}>Adjunta hasta 3 imágenes desde la cámara o tus fotos.</Text>
          <View style={styles.photoButtonRow}>
            <Pressable accessibilityRole="button" accessibilityLabel="Tomar una fotografía" disabled={processingImages} onPress={takePhoto} style={[styles.photoButton, processingImages && styles.photoButtonDisabled]}><Text style={styles.photoButtonText}>Tomar foto</Text></Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Elegir fotografías del teléfono" disabled={processingImages} onPress={chooseFromGallery} style={[styles.photoButton, processingImages && styles.photoButtonDisabled]}><Text style={styles.photoButtonText}>Elegir fotos</Text></Pressable>
          </View>
          {processingImages && <View style={styles.photoProgress}><ActivityIndicator color={colors.green700} /><Text style={styles.pendingText}>Preparando fotografía…</Text></View>}
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {images.map((image, index) => (
              <View key={`${image.uri}-${index}`} style={styles.photoPreviewContainer}>
                <Image source={{ uri: image.uri }} style={styles.photoPreview} />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Quitar fotografía ${index + 1}`}
                  onPress={() => setImages((current) => current.filter((_, position) => position !== index))}
                  style={styles.removePhotoButton}
                >
                  <Text style={styles.removePhotoText}>×</Text>
                </Pressable>
              </View>
            ))}
          </ScrollView>
        </View>
        {!!message && <Text style={styles.errorText}>{message}</Text>}
        <View style={styles.buttonRow}><View style={styles.buttonHalf}><PrimaryButton secondary onPress={() => navigate('forum')}>Cancelar</PrimaryButton></View><View style={styles.buttonWide}><PrimaryButton onPress={publish} disabled={busy || processingImages}>{busy ? 'Publicando…' : 'Publicar consulta'}</PrimaryButton></View></View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function ReplyCard({ reply }) {
  const date = reply.createdAt ? new Date(reply.createdAt) : new Date();
  const replyRole = reply.authorRole === 'Egresado'
    ? (reply.authorVerified ? 'Egresado/a validado/a' : 'Cuenta de egresado/a sin validar')
    : roleLabel(reply.authorRole);
  return (
    <View style={styles.replyCard}>
      <View style={styles.replyHeader}>
        <View style={styles.flex}>
          <Text style={styles.replyAuthor}>{reply.authorName || 'Usuario'}</Text>
          <Text style={styles.metaText}>{replyRole} · {date.toLocaleDateString('es-CL')}</Text>
        </View>
        {reply.authorVerified && <Text style={styles.verifiedBadge}>Validado al responder</Text>}
      </View>
      <Text style={styles.replyBody}>{reply.body}</Text>
    </View>
  );
}

function PostDetailScreen({ user, post, navigate }) {
  const [replies, setReplies] = useState([]);
  const [postImages, setPostImages] = useState([]);
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!post?.id) return undefined;
    const unsubscribeReplies = subscribeReplies(post.id, setReplies, (error) => setMessage(error.message));
    const unsubscribeImages = subscribePostImages(post.id, setPostImages, (error) => setMessage(error.message));
    return () => {
      unsubscribeReplies();
      unsubscribeImages();
    };
  }, [post?.id]);

  const publishReply = async () => {
    setMessage('');
    if (!body.trim()) return setMessage('Escribe una respuesta antes de publicar.');
    try {
      setBusy(true);
      await createReply({ postId: post.id, body: body.trim(), user });
      setBody('');
    } catch (error) {
      setMessage(error.message || 'No fue posible publicar la respuesta.');
    } finally {
      setBusy(false);
    }
  };

  if (!post) {
    return (
      <View style={styles.screenContent}>
        <EmptyState text="No encontramos esta consulta. Vuelve al foro e inténtalo nuevamente." />
        <PrimaryButton secondary onPress={() => navigate('forum')}>Volver al foro</PrimaryButton>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.screenContent} keyboardShouldPersistTaps="handled">
        <Pressable accessibilityRole="button" onPress={() => navigate('forum')}><Text style={styles.textLinkInline}>‹ Volver al foro</Text></Pressable>
        <PostCard post={post} images={postImages} />
        <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Respuestas de la comunidad</Text><Text style={styles.metaText}>{replies.length} respuesta(s)</Text></View>
        {replies.map((reply) => <ReplyCard key={reply.id} reply={reply} />)}
        {!replies.length && <EmptyState text="Aún no hay respuestas. Sé el primero en ayudar." />}
        <View style={styles.replyForm}>
          <Field label="Escribe una respuesta">
            <TextInput
              accessibilityLabel="Escribir respuesta"
              value={body}
              onChangeText={setBody}
              placeholder="Comparte una orientación clara para esta consulta..."
              placeholderTextColor="#89938C"
              multiline
              maxLength={600}
              style={[styles.input, styles.textarea]}
            />
          </Field>
          {!!message && <Text style={styles.errorText}>{message}</Text>}
          <PrimaryButton onPress={publishReply} disabled={busy}>{busy ? 'Publicando…' : 'Publicar respuesta'}</PrimaryButton>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function GraduatesScreen() {
  const [approvedGraduates, setApprovedGraduates] = useState([]);
  const [specialty, setSpecialty] = useState('Todas');
  const [message, setMessage] = useState('');
  const specialties = useMemo(() => ['Todas', ...new Set(approvedGraduates.map((graduate) => graduate.specialty))], [approvedGraduates]);
  const filtered = specialty === 'Todas' ? approvedGraduates : approvedGraduates.filter((graduate) => graduate.specialty === specialty);

  useEffect(() => subscribeApprovedGraduates(
    setApprovedGraduates,
    (error) => setMessage(error.message),
  ), []);

  const contactGraduate = async (graduate) => {
    const subject = encodeURIComponent('Consulta desde AgroConecta');
    const body = encodeURIComponent(`Hola ${graduate.name}, te contacto desde AgroConecta para pedir apoyo técnico.`);
    const url = `mailto:${graduate.contactEmail}?subject=${subject}&body=${body}`;
    try {
      setMessage(`Abriendo correo para contactar a ${graduate.name}.`);
      await Linking.openURL(url);
    } catch {
      setMessage('No fue posible abrir la aplicación de correo en este dispositivo.');
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.screenContent}>
      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>Egresados validados</Text>
        <Text style={styles.infoText}>Solo aparecen perfiles revisados por una cuenta administradora. Los antecedentes privados utilizados en la revisión no se muestran en este directorio.</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
        {specialties.map((item) => (
          <Pressable key={item} accessibilityRole="button" accessibilityState={{ selected: specialty === item }} onPress={() => setSpecialty(item)} style={[styles.filterChip, specialty === item && styles.filterChipActive]}>
            <Text style={[styles.filterChipText, specialty === item && styles.filterChipTextActive]}>{item}</Text>
          </Pressable>
        ))}
      </ScrollView>
      {!!message && <Text style={styles.mapMessage}>{message}</Text>}
      {filtered.map((graduate) => (
        <View key={graduate.id} style={styles.graduateCard}>
          <View style={styles.graduateAvatar}><Text style={styles.graduateAvatarText}>{graduate.name.charAt(0)}</Text></View>
          <View style={styles.flex}>
            <View style={styles.replyHeader}>
              <Text style={styles.graduateName}>{graduate.name}</Text>
              <Text style={styles.verifiedBadge}>Validado</Text>
            </View>
            <Text style={styles.graduateMeta}>{graduate.specialty} · {graduate.experienceYears} año(s) de experiencia</Text>
            <Text style={styles.graduateSummary}>{graduate.summary}</Text>
            <Pressable accessibilityRole="link" onPress={() => contactGraduate(graduate)} style={styles.contactButton}>
              <Text style={styles.contactButtonText}>Contactar por correo</Text>
            </Pressable>
          </View>
        </View>
      ))}
      {!filtered.length && <EmptyState text="Todavía no hay egresados aprobados para este filtro." />}
    </ScrollView>
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

  const getCurrentCoordinates = async () => {
    try {
      const servicesEnabled = await Location.hasServicesEnabledAsync();
      if (!servicesEnabled) {
        setMessage('Activa el GPS del teléfono para usar tu ubicación y calcular una ruta.');
        return null;
      }
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        setMessage('Activa el permiso de ubicación para calcular la ruta desde tu posición.');
        return null;
      }
      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      return { latitude: location.coords.latitude, longitude: location.coords.longitude };
    } catch {
      setMessage('No pudimos obtener tu ubicación. Revisa que el GPS del teléfono esté activado.');
      return null;
    }
  };

  const locate = async () => {
    setMessage('Obteniendo tu ubicación…');
    const current = await getCurrentCoordinates();
    if (current) {
      setUserLocation(current);
      setRegion({ ...current, latitudeDelta: 0.08, longitudeDelta: 0.08 });
      setMessage('Mapa centrado en tu ubicación. La tienda seleccionada puede quedar fuera de esta vista si está más lejos.');
    }
  };

  useEffect(() => {
    let mounted = true;
    const centerOnUser = async () => {
      setMessage('Buscando tu ubicación para centrar el mapa…');
      const current = await getCurrentCoordinates();
      if (!mounted || !current) return;
      setUserLocation(current);
      setRegion({ ...current, latitudeDelta: 0.08, longitudeDelta: 0.08 });
      setMessage('Mapa centrado en tu ubicación actual. Selecciona un punto de venta.');
    };
    centerOnUser();
    return () => { mounted = false; };
  }, []);

  const openRoute = async () => {
    setMessage('Calculando el punto de partida…');
    const current = await getCurrentCoordinates();
    if (!current) return;

    setUserLocation(current);
    const origin = `${current.latitude},${current.longitude}`;
    const destination = `${selected.latitude},${selected.longitude}`;
    const url = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}`;
    try {
      await Linking.openURL(url);
      setMessage(`Ruta solicitada hacia ${selected.name}. Elige en Google Maps si quieres ir en auto, caminando u otro medio.`);
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
        <Pressable accessibilityRole="link" onPress={openRoute} style={styles.routeButton}><Text style={styles.routeButtonText}>Ver opciones de ruta ↗</Text></Pressable>
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

const VERIFICATION_COPY = {
  draft: ['Perfil sin enviar', 'Completa tus antecedentes y envíalos para revisión.'],
  pending: ['Solicitud en revisión', 'Tu solicitud fue recibida y se encuentra en proceso de revisión. Mientras tanto, puedes seguir utilizando las demás funciones de AgroConecta.'],
  approved: ['Perfil aprobado', 'Tu ficha pública ya puede aparecer en el directorio.'],
  rejected: ['Solicitud rechazada', 'Corrige los antecedentes indicados y vuelve a enviarlos.'],
};

function GraduateProfileScreen({ user }) {
  const [form, setForm] = useState({
    rut: user.rut,
    university: user.university,
    degree: user.degree,
    graduationYear: String(user.graduationYear || ''),
    degreeFolio: user.degreeFolio,
    specialty: user.specialty,
    experienceYears: String(user.experienceYears ?? ''),
    contactEmail: user.contactEmail,
    professionalDescription: user.professionalDescription,
  });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    setForm({
      rut: user.rut,
      university: user.university,
      degree: user.degree,
      graduationYear: String(user.graduationYear || ''),
      degreeFolio: user.degreeFolio,
      specialty: user.specialty,
      experienceYears: String(user.experienceYears ?? ''),
      contactEmail: user.contactEmail,
      professionalDescription: user.professionalDescription,
    });
  }, [user.uid, user.verificationStatus, user.updatedAt]);

  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  const statusCopy = VERIFICATION_COPY[user.verificationStatus] || VERIFICATION_COPY.draft;
  const isPending = user.verificationStatus === 'pending';

  const submit = async () => {
    setMessage('');
    const required = [form.rut, form.university, form.degree, form.graduationYear, form.degreeFolio, form.specialty, form.experienceYears, form.contactEmail, form.professionalDescription];
    if (required.some((value) => !String(value).trim())) return setMessage('Completa todos los campos del perfil profesional.');
    if (!isValidChileanRut(form.rut)) return setMessage('Ingresa un RUT chileno válido con su dígito verificador.');
    const graduationYear = Number(form.graduationYear);
    const experienceYears = Number(form.experienceYears);
    const currentYear = new Date().getFullYear();
    if (!Number.isInteger(graduationYear) || graduationYear < 1950 || graduationYear > currentYear) return setMessage('Ingresa un año de titulación válido.');
    if (!Number.isInteger(experienceYears) || experienceYears < 0 || experienceYears > 60) return setMessage('Los años de experiencia deben estar entre 0 y 60.');
    if (!/^\S+@\S+\.\S+$/.test(form.contactEmail.trim())) return setMessage('Ingresa un correo de contacto válido.');
    if (form.professionalDescription.trim().length < 20) return setMessage('Escribe una descripción profesional de al menos 20 caracteres.');

    try {
      setBusy(true);
      await submitGraduateProfile({
        userId: user.uid,
        profile: {
          rut: normalizeChileanRut(form.rut),
          university: form.university.trim(),
          degree: form.degree.trim(),
          graduationYear,
          degreeFolio: form.degreeFolio.trim(),
          specialty: form.specialty.trim(),
          experienceYears,
          contactEmail: form.contactEmail.trim().toLowerCase(),
          professionalDescription: form.professionalDescription.trim(),
        },
      });
      setMessage('Perfil enviado. Quedó pendiente de validación.');
    } catch (error) {
      setMessage(error.message || 'No fue posible enviar el perfil.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.screenContent} keyboardShouldPersistTaps="handled">
        <View style={styles.profileCard}>
          <View style={styles.avatar}><Text style={styles.avatarText}>{user.name?.charAt(0)?.toUpperCase() || 'E'}</Text></View>
          <Text style={styles.profileName}>{user.name}</Text>
          <Text style={styles.profileRole}>{roleLabel(user.role)}</Text>
          <Text style={styles.profileEmail}>{user.email}</Text>
        </View>
        <View style={[styles.verificationCard, user.verificationStatus === 'approved' && styles.verificationApproved]}>
          <Text style={styles.verificationTitle}>{statusCopy[0]}</Text>
          <Text style={styles.verificationText}>{statusCopy[1]}</Text>
          {user.verificationStatus === 'rejected' && !!user.rejectionReason && <Text style={styles.rejectionText}>Motivo: {user.rejectionReason}</Text>}
        </View>
        <Text style={styles.sectionTitle}>Antecedentes profesionales</Text>
        <Text style={styles.formHelp}>Estos datos se usan para la revisión. El RUT, el folio y la formación no se publican en el directorio.</Text>
        <Field disabled={isPending} label="RUT *" value={form.rut} onChangeText={(value) => update('rut', value.replace(/[^0-9kK.\-]/g, '').slice(0, 12))} placeholder="Ej.: 12.345.678-5" autoCapitalize="characters" maxLength={12} />
        <Field disabled={isPending} label="Institución de formación *" value={form.university} onChangeText={(value) => update('university', value)} placeholder="Ej.: Universidad de Tarapacá" maxLength={100} />
        <Field disabled={isPending} label="Título o grado *" value={form.degree} onChangeText={(value) => update('degree', value)} placeholder="Ej.: Ingeniería Agronómica" maxLength={100} />
        <Field disabled={isPending} label="Año de titulación *" value={form.graduationYear} onChangeText={(value) => update('graduationYear', value.replace(/\D/g, ''))} placeholder="Ej.: 2022" keyboardType="number-pad" maxLength={4} />
        <Field disabled={isPending} label="Folio o referencia del título *" value={form.degreeFolio} onChangeText={(value) => update('degreeFolio', value)} placeholder="Dato privado para revisión" maxLength={50} />
        <Field disabled={isPending} label="Especialidad *" value={form.specialty} onChangeText={(value) => update('specialty', value)} placeholder="Ej.: Riego, plagas o nutrición" maxLength={60} />
        <Field disabled={isPending} label="Años de experiencia *" value={form.experienceYears} onChangeText={(value) => update('experienceYears', value.replace(/\D/g, ''))} placeholder="Ej.: 3" keyboardType="number-pad" maxLength={2} />
        <Field disabled={isPending} label="Correo de contacto público *" value={form.contactEmail} onChangeText={(value) => update('contactEmail', value)} placeholder="nombre@correo.cl" keyboardType="email-address" autoCapitalize="none" maxLength={100} />
        <Field label="Descripción profesional *">
          <TextInput accessibilityLabel="Descripción profesional" editable={!isPending} value={form.professionalDescription} onChangeText={(value) => update('professionalDescription', value)} placeholder="Describe brevemente en qué puedes apoyar a los agricultores." placeholderTextColor="#89938C" multiline maxLength={400} style={[styles.input, styles.textarea, isPending && styles.inputDisabled]} />
        </Field>
        {!!message && <Text style={message.includes('enviado') ? styles.successText : styles.errorText}>{message}</Text>}
        {isPending
          ? <PrimaryButton disabled>Esperando revisión del administrador</PrimaryButton>
          : <PrimaryButton onPress={submit} disabled={busy}>{busy ? 'Enviando…' : user.verificationStatus === 'approved' ? 'Guardar cambios y enviar a revisión' : user.verificationStatus === 'rejected' ? 'Corregir y reenviar' : 'Enviar para validación'}</PrimaryButton>}
        <View style={styles.signOutSpacing}><PrimaryButton secondary onPress={signOutUser}>Cerrar sesión</PrimaryButton></View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function AdminReviewScreen({ user }) {
  const [pending, setPending] = useState([]);
  const [reasons, setReasons] = useState({});
  const [busyId, setBusyId] = useState(null);
  const [message, setMessage] = useState('');

  useEffect(() => subscribePendingGraduates(
    setPending,
    (error) => setMessage(error.message),
  ), []);

  const review = async (profile, approved) => {
    const reason = (reasons[profile.id] || '').trim();
    if (approved && !profile.rut) return setMessage(`La solicitud de ${profile.name} no incluye RUT. El egresado debe actualizarla y reenviarla.`);
    if (!approved && !reason) return setMessage('Escribe un motivo antes de rechazar la solicitud.');
    try {
      setBusyId(profile.id);
      setMessage('');
      await reviewGraduateProfile({ profile, approved, reason, reviewerId: user.uid });
      setMessage(approved ? `Perfil de ${profile.name} aprobado.` : `Solicitud de ${profile.name} rechazada.`);
    } catch (error) {
      setMessage(error.message || 'No fue posible revisar la solicitud.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.screenContent} keyboardShouldPersistTaps="handled">
      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>Validación de egresados</Text>
        <Text style={styles.infoText}>Revisa los antecedentes antes de aprobar. Solo la ficha de contacto se publicará en el directorio.</Text>
      </View>
      {!!message && <Text style={message.includes('aprobado') ? styles.successText : styles.mapMessage}>{message}</Text>}
      {pending.map((profile) => (
        <View key={profile.id} style={styles.adminCard}>
          <Text style={styles.graduateName}>{profile.name}</Text>
          <Text style={styles.graduateMeta}>{profile.degree} · {profile.university}</Text>
          <Text style={styles.adminDetail}>RUT: {formatChileanRut(profile.rut)}</Text>
          <Text style={styles.adminDetail}>Correo de contacto: {profile.contactEmail}</Text>
          <Text style={styles.adminDetail}>Año: {profile.graduationYear}  |  Folio: {profile.degreeFolio}</Text>
          <Text style={styles.adminDetail}>Especialidad: {profile.specialty}  |  Experiencia: {profile.experienceYears} año(s)</Text>
          <Text style={styles.graduateSummary}>{profile.professionalDescription}</Text>
          <TextInput value={reasons[profile.id] || ''} onChangeText={(value) => setReasons((current) => ({ ...current, [profile.id]: value }))} placeholder="Motivo si se rechaza" placeholderTextColor="#89938C" multiline maxLength={180} style={[styles.input, styles.adminReasonInput]} />
          <View style={styles.adminActions}>
            <View style={styles.flex}><PrimaryButton secondary onPress={() => review(profile, false)} disabled={busyId === profile.id}>Rechazar</PrimaryButton></View>
            <View style={styles.flex}><PrimaryButton onPress={() => review(profile, true)} disabled={busyId === profile.id || !profile.rut}>{busyId === profile.id ? 'Procesando…' : profile.rut ? 'Aprobar' : 'Falta RUT'}</PrimaryButton></View>
          </View>
        </View>
      ))}
      {!pending.length && <EmptyState text="No hay solicitudes pendientes de validación." />}
      <View style={styles.signOutSpacing}><PrimaryButton secondary onPress={signOutUser}>Cerrar sesión</PrimaryButton></View>
    </ScrollView>
  );
}

function ProfileScreen({ user }) {
  if (user.role === 'Egresado') return <GraduateProfileScreen user={user} />;
  if (user.role === 'Administrador') return <AdminReviewScreen user={user} />;
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
  const [selectedPostId, setSelectedPostId] = useState(null);
  const [posts, setPosts] = useState([]);

  useEffect(() => subscribePosts(setPosts, (error) => Alert.alert('Foro', error.message)), []);
  const navigate = (next, params = {}) => {
    if (params.postId) setSelectedPostId(params.postId);
    setRoute(next);
  };
  const openPost = (post) => navigate('postDetail', { postId: post.id });
  const selectedPost = posts.find((post) => post.id === selectedPostId);

  return (
    <SafeAreaView style={styles.app}>
      <StatusBar style="dark" />
      <Header route={route} onHome={() => navigate('home')} />
      <View style={styles.mainArea}>
        {route === 'home' && <HomeScreen user={user} posts={posts} navigate={navigate} openPost={openPost} />}
        {route === 'forum' && <ForumScreen user={user} posts={posts} navigate={navigate} openPost={openPost} />}
        {route === 'postDetail' && <PostDetailScreen user={user} post={selectedPost} navigate={navigate} />}
        {route === 'create' && <CreateScreen user={user} navigate={navigate} />}
        {route === 'graduates' && <GraduatesScreen />}
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
    content = user ? <MainApp user={user} /> : <SafeAreaView style={[styles.app, { backgroundColor: colors.green50 }]}><StatusBar style="dark" /><AuthScreen /></SafeAreaView>;
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
  inputDisabled: { backgroundColor: '#F0F3F0', color: '#667168' },
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
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  quickCard: { width: '48%', minHeight: 126, borderWidth: 1, borderColor: colors.line, borderRadius: 16, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center', padding: 9, ...shadows.small },
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
  openPostHint: { color: colors.green700, fontSize: 12, fontWeight: '900', marginTop: 10 },
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

  photoButtonRow: { flexDirection: 'row', gap: 10, marginTop: 12, marginBottom: 12 },
  photoButton: { flex: 1, borderWidth: 1, borderColor: colors.green700, borderRadius: 10, paddingVertical: 11, alignItems: 'center', backgroundColor: colors.green50 },
  photoButtonDisabled: { opacity: 0.45 },
  photoButtonText: { color: colors.green800, fontWeight: '700' },
  photoProgress: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  photoPreviewContainer: { position: 'relative', marginRight: 10 },
  photoPreview: { width: 110, height: 110, borderRadius: 12, backgroundColor: colors.green100 },
  removePhotoButton: { position: 'absolute', top: 5, right: 5, width: 25, height: 25, borderRadius: 13, backgroundColor: 'rgba(0,0,0,0.65)', alignItems: 'center', justifyContent: 'center' },
  removePhotoText: { color: colors.white, fontSize: 20, lineHeight: 22, fontWeight: '700' },
  postImagesRow: { marginTop: 12 },
  postImageButton: { position: 'relative', marginRight: 10 },
  postImage: { width: 120, height: 120, borderRadius: 12, backgroundColor: colors.green100 },
  expandImageBadge: { position: 'absolute', right: 6, bottom: 6, width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.65)' },
  expandImageBadgeText: { color: colors.white, fontSize: 15, fontWeight: '900' },
  imageViewerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12, paddingVertical: 30 },
  imageViewerImage: { width: '100%', height: '80%' },
  imageViewerClose: { position: 'absolute', top: 45, right: 20, zIndex: 10, width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.2)' },
  imageViewerCloseText: { color: colors.white, fontSize: 34, lineHeight: 37, fontWeight: '500' },
  imageViewerHint: { color: colors.white, fontSize: 13, marginTop: 8, opacity: 0.8 },
  replyCard: { borderWidth: 1, borderColor: colors.line, borderRadius: 14, backgroundColor: colors.white, padding: 13, marginBottom: 10 },
  replyHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  replyAuthor: { color: colors.ink, fontSize: 14, fontWeight: '900' },
  replyBody: { color: '#536158', fontSize: 13, lineHeight: 19, marginTop: 9 },
  verifiedBadge: { overflow: 'hidden', color: colors.green800, backgroundColor: colors.green100, borderRadius: 99, paddingHorizontal: 8, paddingVertical: 4, fontSize: 10, fontWeight: '900' },
  replyForm: { marginTop: 8, borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 14 },
  infoCard: { borderWidth: 1, borderColor: colors.line, backgroundColor: colors.green50, borderRadius: 16, padding: 15, marginBottom: 12 },
  infoTitle: { color: colors.green900, fontSize: 17, fontWeight: '900' },
  infoText: { color: colors.muted, fontSize: 13, lineHeight: 19, marginTop: 6 },
  graduateCard: { flexDirection: 'row', gap: 12, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white, borderRadius: 16, padding: 14, marginBottom: 10, ...shadows.small },
  graduateAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.green700, alignItems: 'center', justifyContent: 'center' },
  graduateAvatarText: { color: colors.white, fontSize: 18, fontWeight: '900' },
  graduateName: { color: colors.ink, fontSize: 15, fontWeight: '900', flexShrink: 1 },
  graduateMeta: { color: colors.green700, fontSize: 12, lineHeight: 17, fontWeight: '800', marginTop: 3 },
  graduateSummary: { color: '#536158', fontSize: 13, lineHeight: 19, marginTop: 7 },
  contactButton: { alignSelf: 'flex-start', minHeight: 38, borderRadius: 10, backgroundColor: colors.green700, justifyContent: 'center', paddingHorizontal: 12, marginTop: 10 },
  contactButtonText: { color: colors.white, fontSize: 12, fontWeight: '900' },
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
  verificationCard: { borderWidth: 1, borderColor: '#D9C98D', borderRadius: 14, padding: 14, backgroundColor: '#FFF9E8', marginVertical: 14 },
  verificationApproved: { borderColor: '#B9D6BE', backgroundColor: colors.green50 },
  verificationTitle: { color: colors.green900, fontSize: 15, fontWeight: '900' },
  verificationText: { color: colors.muted, fontSize: 13, lineHeight: 18, marginTop: 4 },
  rejectionText: { color: '#9A3D32', fontSize: 13, lineHeight: 18, fontWeight: '700', marginTop: 8 },
  formHelp: { color: colors.muted, fontSize: 12, lineHeight: 17, marginTop: 6, marginBottom: 14 },
  signOutSpacing: { marginTop: 12 },
  adminCard: { borderWidth: 1, borderColor: colors.line, borderRadius: 16, backgroundColor: colors.white, padding: 14, marginBottom: 12, ...shadows.small },
  adminDetail: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 5 },
  adminReasonInput: { minHeight: 82, paddingTop: 13, textAlignVertical: 'top' },
  adminActions: { flexDirection: 'row', gap: 9, marginTop: 10 },
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
