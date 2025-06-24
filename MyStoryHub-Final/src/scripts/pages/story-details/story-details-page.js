import {
  generateStoryDetailsErrorTemplate,
  generateStoryDetailsTemplate,
  generateSaveStoryButtonTemplate,
  generateRemoveStoryButtonTemplate,
  generateLoaderAbsoluteTemplate,
} from "../../template";
import StoryDetailsPresenter from "./story-details-presenter";
import { parseActivePathname } from "../../routes/url-parser";
import Map from "../../utils/map";
import * as StoryAPI from "../../data/api";
import IdbSource from '../../data/idb-source';

export default class StoryDetailsPage {
  constructor() {
    this.presenter = null;
    this.map = null;
}

  async render() {
    return `
      <section class="story-details-container">
        <div class="container">
          <a href="#/home" class="back-button" aria-label="Back to stories list">
            <i class="fas fa-arrow-left"></i> Back to Stories
          </a>
        </div>
        <div id="story-details" class="story-details"></div>
        <div id="story-details-loading-container" class="story-details-loading"></div>
      </section>
    `;
  }

  async afterRender() {
    const storyId = parseActivePathname().id;

    if (!storyId) {
      this.populateStoryDetailsError("Story ID not found");
      return;
    }

    this.presenter = new StoryDetailsPresenter(storyId, {
      view: this,
      apiModel: StoryAPI,
    });

    this.presenter.showStoryDetails();
  }

  async populateStoryDetailsAndInitialMap(message, story) {
      const location = story.location || { lat: 0, lon: 0, placeName: "Unknown location",};

      const lat = location.lat !== undefined ? location.lat : 0;
      const lon = location.lon !== undefined ? location.lon : 0;

      document.getElementById("story-details").innerHTML = generateStoryDetailsTemplate({
        name: story.name || "Unknown",
        description: story.description || "No description available",
        photoUrl: story.photoUrl,
        location: {
          ...location,
          lat,
          lon,
        },
        createdAt: story.createdAt || new Date().toISOString(),
      });

      await this.initialMap();

      if (this.map) {
        const storyCoordinate = [lat, lon];

        if ((lat !== 0 || lon !== 0) &&!isNaN(Number(lat)) &&!isNaN(Number(lon))) {
          const markerOptions = { alt: `${story.name}'s story location` };
          const popupOptions = { content: `${story.name}'s story was shared from here`,};

          this.map.changeCamera(storyCoordinate, 15);
          this.map.addMarker(storyCoordinate, markerOptions, popupOptions);
        } else {
          console.warn("Story has invalid coordinates:",{ lat, lon },"using default map view");
        }
      } else {
        console.error("Map not initialized");
      }

      this.presenter.showSaveButton();
      this.addShareEventListener();
  }
  populateStoryDetailsError(message) {
    document.getElementById("story-details").innerHTML =generateStoryDetailsErrorTemplate(message);
  }

async initialMap() {
    try {
      const mapElement = document.getElementById('map');
      if (!mapElement) {
        console.error('Map element not found');
        return;
      }

      mapElement.style.backgroundColor = '#f0f0f0';

      this.map = await Map.build('#map', {
        zoom: 15,
      });

      if (!this.map) {
        console.error('Failed to create map instance');
        mapElement.innerHTML = `
          <div class="map-error">
            <i class="fas fa-exclamation-triangle"></i>
            <p>Unable to load map. Please check your internet connection.</p>
          </div>
        `;
      } else {
        console.log('Map initialized successfully');
      }
    } catch (error) {
      console.error('Error initializing map:', error);
      const mapElement = document.getElementById('map');
      if (mapElement) {
        mapElement.innerHTML = `
          <div class="map-error">
            <i class="fas fa-exclamation-triangle"></i>
            <p>Unable to load map. Please check your internet connection.</p>
          </div>
        `;
      }
    }
  }

  renderSaveButton() {
  const saveContainer = document.getElementById('save-actions-container');
  if (saveContainer) {
    saveContainer.innerHTML = generateSaveStoryButtonTemplate();

    document.getElementById('story-details-save')?.addEventListener('click', async () => {
      const storyId = parseActivePathname().id;
      const storyData = {
        id: storyId,
        name: document.querySelector('.story-details-title').textContent,
        description: document.querySelector('.story-details__description').textContent,
        photoUrl: document.querySelector('.story-details__image').src,
        createdAt: new Date().toISOString(),
        location: {
          lat: document
            .querySelector('.story-details__location-coordinates')
            .textContent.split('Latitude: ')[1]
            .split('\n')[0],
          lon: document
            .querySelector('.story-details__location-coordinates')
            .textContent.split('Longitude: ')[1],
        },
      };

      // Simpan cerita secara online
      const response = await this.presenter.toggleFavorite(storyData);

      if (response) {
        alert('Cerita berhasil disimpan di favorit!');
      }

      // Simpan cerita secara offline ke IndexedDB
      try {
        const savedStory = await IdbSource.getStoryById(storyId);
        if (!savedStory) {
          await IdbSource.saveStory(storyData);
          alert('Cerita berhasil disimpan untuk dibaca offline!');
        } else {
          alert('Cerita sudah disimpan untuk dibaca offline.');
        }
      } catch (error) {
        console.error('Gagal menyimpan cerita offline:', error);
        alert('Gagal menyimpan cerita offline. Silakan coba lagi.');
      }
    });
  }
}

renderRemoveButton() {
  const saveContainer = document.getElementById("save-actions-container");
  if (saveContainer) {
    saveContainer.innerHTML = generateRemoveStoryButtonTemplate();

    document.getElementById("story-details-remove")?.addEventListener("click", async () => {
      const storyId = parseActivePathname().id;

      // Hapus cerita dari favorit online
      const response = await this.presenter.toggleFavorite();

      // Hapus cerita dari IndexedDB
      try {
        await IdbSource.deleteStory(storyId);
        alert("Cerita berhasil dihapus dari favorit offline!");
      } catch (error) {
        console.error('Gagal menghapus cerita offline:', error);
        alert('Gagal menghapus cerita offline. Silakan coba lagi.');
      }

      if (!response) {
        alert("Cerita berhasil dihapus dari favorit!");
      }
    });
  }
}


  addShareEventListener() {
    const shareButton = document.getElementById("story-details-share");
    if (shareButton) {
      shareButton.addEventListener("click", () => {
        if (navigator.share) {
          navigator
            .share({
              title: "Check out this story on MyStoryHub",
              text: "I found an interesting story on MyStoryHub!",
              url: window.location.href,
            })
            .catch((error) => console.log("Error sharing:", error));
        } else {
          alert(
            "Sharing is not supported in your browser. Copy the URL to share manually."
          );
        }
      });
    }
  }

  showStoryDetailsLoading() {
    const loadingContainer = document.getElementById("story-details-loading-container");
    if (loadingContainer) {
      loadingContainer.innerHTML = generateLoaderAbsoluteTemplate();
    }
  }

  hideStoryDetailsLoading() {
    const loadingContainer = document.getElementById("story-details-loading-container");
    if (loadingContainer) {
      loadingContainer.innerHTML = "";
    }
  }

  showMapLoading() {
    const mapLoadingContainer = document.getElementById("map-loading-container");
    if (mapLoadingContainer) {
      mapLoadingContainer.innerHTML = generateLoaderAbsoluteTemplate();
    }
  }

  hideMapLoading() {
    const mapLoadingContainer = document.getElementById("map-loading-container");
    if (mapLoadingContainer) {
      mapLoadingContainer.innerHTML = "";
    }
  }
}
