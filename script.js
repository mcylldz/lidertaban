// Ensure video plays automatically and loops like a GIF
document.addEventListener('DOMContentLoaded', () => {
    const video = document.querySelector('video');

    if (video) {
        // Force autoplay
        video.play().catch(() => {
            // If autoplay is blocked, try again on user interaction
            document.addEventListener('click', () => {
                video.play();
            }, { once: true });
        });

        // Ensure it loops forever
        video.addEventListener('ended', () => {
            video.currentTime = 0;
            video.play();
        });
    }
});
