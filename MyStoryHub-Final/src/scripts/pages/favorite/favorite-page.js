import { generateStoryItemTemplate } from "../../template";
import IdbSource from '../../data/idb-source';

export default class FavoritePage {
  async render() {
    return `
      <section class="container">
        <div class="favorite-container">
          <h1 class="section-title">Favorite Stories</h1>
          
          <div id="favorite-stories-container" class="favorite-content">
            <!-- Stories will be loaded here -->
          </div>
        </div>
      </section>
    `;
  }

  async afterRender() {
    this.loadFavoriteStories();
  }


    async loadFavoriteStories() {
    const container = document.getElementById('favorite-stories-container');
    container.innerHTML = '<div class="loader"></div>';

    try {
      const stories = await IdbSource.getStories();

       if (!stories || stories.length === 0) {
        container.innerHTML = `
          <div class="favorite-message">
            <h2>No Favorite Stories</h2>
            <p>You haven't favorited any stories yet. Browse stories and click the favorite button to save them for later.</p>
            <a href="#/home" class="btn">Browse Stories</a>
          </div>
        `;
        return;
      }

      const html = stories.reduce((accumulator, story) => {
        return accumulator.concat(
          generateStoryItemTemplate({
            ...story,
            name: story.name,
          }),
        );
      }, '');

      container.innerHTML = `
        <div class="stories-list">${html}</div>
      `;

      // Tambahkan tombol hapus untuk setiap cerita
      const storyItems = container.querySelectorAll('.story-item');
      storyItems.forEach((item) => {
        const storyId = item.dataset.storyid;
        const deleteButton = document.createElement('button');
        deleteButton.className = 'btn btn-outline delete-favorite-btn';
        deleteButton.innerHTML = '<i class="fas fa-trash"></i> Delete Favorite';
        deleteButton.addEventListener('click', async () => {
          if (confirm('Apakah Anda yakin ingin menghapus cerita ini dari penyimpanan favorite?')) {
            await IdbSource.deleteStory(storyId);
            this.loadFavoriteStories();
          }
        });
        item.querySelector('.story-item__body').appendChild(deleteButton);
      });
    } catch (error) {
      console.error('Error loading offline stories:', error);
      container.innerHTML = `
        <div class="favorite-message">
          <h2>Failed to Load Online Story</h2>
          <p>An error occurred while loading online stories. Please try again later.</p>
          <button class="btn" onclick="this.loadFavoriteStories()">Coba Lagi</button>
        </div>
      `;
    }
  }
}
