import React, { useState, useRef, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TextInput,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import AppHeader from '../../components/common/AppHeader';
import api from '../../services/api';

const WELCOME = {
    id: 'welcome',
    role: 'assistant',
    content: '¡Hola! Soy el asistente de Tu App Food 🍔 ¿En qué puedo ayudarte hoy?',
};

function Bubble({ message }) {
    const isUser = message.role === 'user';
    return (
        <View style={[styles.bubbleRow, isUser && styles.bubbleRowUser]}>
            {!isUser && (
                <View style={styles.avatar}>
                    <Ionicons name="chatbubble-ellipses" size={16} color="#ff8800" />
                </View>
            )}
            <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleBot]}>
                <Text style={[styles.bubbleText, isUser && styles.bubbleTextUser]}>
                    {message.content}
                </Text>
            </View>
        </View>
    );
}

function TypingIndicator() {
    return (
        <View style={styles.bubbleRow}>
            <View style={styles.avatar}>
                <Ionicons name="chatbubble-ellipses" size={16} color="#ff8800" />
            </View>
            <View style={[styles.bubble, styles.bubbleBot, styles.typingBubble]}>
                <ActivityIndicator size="small" color="#ff8800" />
            </View>
        </View>
    );
}

export default function ChatSupportScreen({ navigation }) {
    const insets = useSafeAreaInsets();
    const tabBarHeight = useBottomTabBarHeight();
    const [messages, setMessages] = useState([WELCOME]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const listRef = useRef(null);

    const scrollToBottom = useCallback(() => {
        setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }, []);

    const sendMessage = async () => {
        const text = input.trim();
        if (!text || loading) return;

        const userMsg = { id: Date.now().toString(), role: 'user', content: text };
        const nextMessages = [...messages, userMsg];
        setMessages(nextMessages);
        setInput('');
        setLoading(true);
        scrollToBottom();

        // Solo mandamos role+content al backend (sin id)
        const history = nextMessages
            .filter(m => m.id !== 'welcome')
            .map(({ role, content }) => ({ role, content }));

        try {
            const res = await api.support.chat(history);
            if (res.success) {
                setMessages(prev => [
                    ...prev,
                    { id: Date.now().toString() + '_bot', role: 'assistant', content: res.reply },
                ]);
            } else {
                setMessages(prev => [
                    ...prev,
                    { id: Date.now().toString() + '_err', role: 'assistant', content: 'Lo siento, no pude procesar tu consulta. Intentá de nuevo.' },
                ]);
            }
        } catch {
            setMessages(prev => [
                ...prev,
                { id: Date.now().toString() + '_err', role: 'assistant', content: 'Error de conexión. Revisá tu internet e intentá de nuevo.' },
            ]);
        } finally {
            setLoading(false);
            scrollToBottom();
        }
    };

    const headerHeight = insets.top + 44;

    return (
        <View style={styles.container}>
            <AppHeader title="Asistente de soporte" onBack={() => navigation.goBack()} />

            <KeyboardAvoidingView
                style={[styles.flex, { marginTop: headerHeight }]}
                behavior="padding"
                keyboardVerticalOffset={headerHeight + tabBarHeight}
            >
                <FlatList
                    ref={listRef}
                    data={messages}
                    keyExtractor={m => m.id}
                    renderItem={({ item }) => <Bubble message={item} />}
                    style={styles.flex}
                    contentContainerStyle={styles.list}
                    ListFooterComponent={loading ? <TypingIndicator /> : null}
                    onContentSizeChange={scrollToBottom}
                    showsVerticalScrollIndicator={false}
                />

                <View style={[styles.inputBar, { paddingBottom: tabBarHeight + 16 }]}>
                    <TextInput
                        style={styles.input}
                        placeholder="Escribí tu consulta..."
                        placeholderTextColor="#aaa"
                        value={input}
                        onChangeText={setInput}
                        multiline
                        maxLength={500}
                        returnKeyType="send"
                        onSubmitEditing={sendMessage}
                        blurOnSubmit={false}
                        accessibilityLabel="Mensaje"
                    />
                    <TouchableOpacity
                        style={[styles.sendBtn, (!input.trim() || loading) && styles.sendBtnDisabled]}
                        onPress={sendMessage}
                        disabled={!input.trim() || loading}
                        accessibilityRole="button"
                        accessibilityLabel="Enviar mensaje"
                    >
                        <Ionicons name="send" size={18} color="#fff" />
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f5f5f5' },
    flex: { flex: 1 },

    list: { flexGrow: 1, justifyContent: 'flex-end', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },

    bubbleRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        marginBottom: 10,
    },
    bubbleRowUser: {
        flexDirection: 'row-reverse',
    },

    avatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(255,136,0,0.12)',
        alignItems: 'center',
        justifyContent: 'center',
        marginHorizontal: 6,
        flexShrink: 0,
    },

    bubble: {
        maxWidth: '75%',
        borderRadius: 18,
        paddingHorizontal: 14,
        paddingVertical: 10,
    },
    bubbleBot: {
        backgroundColor: '#fff',
        borderBottomLeftRadius: 4,
        elevation: 1,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowOffset: { width: 0, height: 1 },
        shadowRadius: 3,
    },
    bubbleUser: {
        backgroundColor: '#ff8800',
        borderBottomRightRadius: 4,
    },
    typingBubble: {
        paddingVertical: 12,
        paddingHorizontal: 18,
    },

    bubbleText:     { fontSize: 15, color: '#1a1a1a', lineHeight: 21 },
    bubbleTextUser: { color: '#fff' },

    inputBar: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        paddingHorizontal: 12,
        paddingTop: 10,
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#efefef',
        gap: 8,
    },
    input: {
        flex: 1,
        backgroundColor: '#f5f5f5',
        borderRadius: 22,
        paddingHorizontal: 16,
        paddingVertical: 10,
        fontSize: 15,
        color: '#1a1a1a',
        maxHeight: 120,
        minHeight: 44,
    },
    sendBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#ff8800',
        alignItems: 'center',
        justifyContent: 'center',
    },
    sendBtnDisabled: {
        backgroundColor: '#ffd199',
    },
});
