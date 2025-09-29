function formatDuration(milliseconds) {
    if (typeof milliseconds !== 'number' || milliseconds < 0) {
        return '';
    }
    if (milliseconds === 0) {
        return '0s';
    }

    const units = [
        { label: 'y', ms: 31536000000 },
        { label: 'M', ms: 2592000000 },
        { label: 'd', ms: 86400000 },
        { label: 'h', ms: 3600000 },
        { label: 'm', ms: 60000 },
        { label: 's', ms: 1000 },
    ];

    const parts = [];
    let remainingMs = milliseconds;

    for (const unit of units) {
        const count = Math.floor(remainingMs / unit.ms);
        if (count > 0) {
            parts.push(`${count}${unit.label}`);
            remainingMs -= count * unit.ms;
        }
    }

    return parts.join(' ') || '0s';
}

module.exports = formatDuration;