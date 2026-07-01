const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

async function sendPushNotification(pushToken, title, body, data = {}, categoryId = null) {
    if (!pushToken || !pushToken.startsWith('ExponentPushToken')) return;

    const message = {
        to: pushToken,
        sound: 'default',
        title,
        body,
        data,
        ...(categoryId && { categoryIdentifier: categoryId }),
    };

    try {
        const response = await fetch(EXPO_PUSH_URL, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(message),
        });

        const result = await response.json();
        if (result.data?.status === 'error') {
            console.error('Expo push error:', result.data.message);
        }
    } catch (error) {
        console.error('Error enviando push notification:', error.message);
    }
}

module.exports = { sendPushNotification };
