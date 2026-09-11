// Presentation helpers for native history summaries; never modify chat data.
export function historyTimestamp(value) {
    if (value == null || value === '') return null;
    const numeric = typeof value === 'number' ? value : Number(value);
    const timestamp = Number.isFinite(numeric) ? numeric : Date.parse(String(value));
    return Number.isFinite(timestamp) && timestamp > 0 && !Number.isNaN(new Date(timestamp).getTime()) ? timestamp : null;
}

export function messageCount(value) {
    const count = Number(value);
    return Number.isFinite(count) && count >= 0 ? Math.floor(count) : 0;
}

export function sortHistory(rows, order = 'recent') {
    return [...rows].sort((a, b) => {
        if (order === 'longest') {
            const difference = messageCount(b.message_count) - messageCount(a.message_count);
            if (difference) return difference;
        }
        const left = historyTimestamp(a.last_mes), right = historyTimestamp(b.last_mes);
        if (left === null) return right === null ? 0 : 1;
        if (right === null) return -1;
        return order === 'oldest' ? left - right : right - left;
    });
}

export function historyTimeLabel(value) {
    const timestamp = historyTimestamp(value);
    if (timestamp === null) return '时间未记录';
    return new Intl.DateTimeFormat('zh-CN', {
        year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }).format(timestamp);
}
