import { expect } from 'chai';
const MockFirebase = require('mock-cloud-firestore');
import { BaseFirestoreRepository } from './BaseFirestoreRepository';
import { getFixture, Album } from '../test/fixture';
import { initialize, MetadataStorageConfig, getMetadataStorage } from './MetadataStorage';
import { Band } from '../test/BandCollection';

// Just a test type to prevent using any other method than
// runTransaction in this file
type TestTransactionRepository<T extends { id: string }> = Pick<
  BaseFirestoreRepository<T>,
  'runTransaction'
>;

class BandRepository extends BaseFirestoreRepository<Band> {}

describe('BaseFirestoreTransactionRepository', () => {
  let bandRepository: TestTransactionRepository<Band> = null;
  let firestore;
  let defaultMetadataConfig: MetadataStorageConfig;

  beforeEach(() => {
    const fixture = Object.assign({}, getFixture());
    const firebase = new MockFirebase(fixture, {
      isNaiveSnapshotListenerEnabled: false,
    });

    firestore = firebase.firestore();
    initialize(firestore, defaultMetadataConfig);

    // Save the default config to reset any changes made in tests
    defaultMetadataConfig = getMetadataStorage().config;

    bandRepository = new BandRepository('bands');
  });

  describe('limit', () => {
    it('must throw when using limit', async () => {
      await bandRepository.runTransaction(async tran => {
        expect(() => tran.limit()).to.throw;
      });
    });
  });

  describe('orderBy*', () => {
    it('must throw when using orderByAscending', async () => {
      await bandRepository.runTransaction(async tran => {
        expect(() => tran.orderByAscending()).to.throw;
      });
    });

    it('must throw when using orderByDescending', async () => {
      await bandRepository.runTransaction(async tran => {
        expect(() => tran.orderByDescending()).to.throw;
      });
    });
  });

  describe('findById', () => {
    it('must find by id', async () => {
      await bandRepository.runTransaction(async tran => {
        const pt = await tran.findById('porcupine-tree');
        expect(pt).instanceOf(Band);
        expect(pt.id).to.equal('porcupine-tree');
        expect(pt.name).to.equal('Porcupine Tree');
      });
    });

    it('must have proper getters', async () => {
      await bandRepository.runTransaction(async tran => {
        const pt = await tran.findById('porcupine-tree');
        expect(pt.getLastShowYear()).to.eql(2010);
      });
    });

    it('return null if not found', async () => {
      await bandRepository.runTransaction(async tran => {
        const sw = await tran.findById('steven-wilson');
        expect(sw).to.be.null;
      });
    });
  });

  describe('create', () => {
    it('should return T when an item is created', async () => {
      const entity = new Band();
      entity.id = 'rush';
      entity.name = 'Rush';
      entity.formationYear = 1968;
      entity.genres = ['progressive-rock', 'hard-rock', 'heavy-metal'];

      await bandRepository.runTransaction(async tran => {
        const band = await tran.create(entity);
        expect(band).to.be.instanceOf(Band);
        expect(band.getPopularGenre()).to.equal('progressive-rock');
      });
    });

    it('must not validate if the validate config property is false', async () => {
      initialize(firestore, { validateModels: false });

      await bandRepository.runTransaction(async tran => {
        const entity = new Band();
        entity.contactEmail = 'Not an email';
        const band = await tran.create(entity);
        expect(band.contactEmail).to.equal('Not an email');
      })
    });

    it('must fail validation if an invalid class is given', async () => {
      await bandRepository.runTransaction(async tran => {
        const entity = new Band();
  
        entity.contactEmail = 'Not an email';

        try {
          await tran.create(entity);
        } catch (error) {
          expect(error[0].constraints.isEmail).to.equal('Invalid email!');
        }
      })
    });

    it('must fail validation if an invalid object is given', async () => {
      await bandRepository.runTransaction(async tran => {
        const entity: Partial<Band> = {
          contactEmail: 'Not an email',
        }

        try {
          await tran.create(entity as Band);
        } catch (error) {
          expect(error[0].constraints.isEmail).to.equal('Invalid email!');
        }
      })
    });

    it('must create items when id is passed', async () => {
      const entity = new Band();
      entity.id = 'perfect-circle';
      entity.name = 'A Perfect Circle';
      entity.formationYear = 1999;
      entity.genres = ['alternative-rock', 'alternative-metal', 'hard-rock'];

      await bandRepository.runTransaction(async tran => {
        const band = await tran.create(entity);
        expect(band.id).to.equal(entity.id);
        expect(band.name).to.equal(entity.name);
        expect(band.formationYear).to.equal(entity.formationYear);
        expect(band.genres).to.equal(entity.genres);
      });
    });

    it('must create items and assign a custom id if no id is passed', async () => {
      const entity = new Band();
      entity.name = 'The Pinapple Thief';
      entity.formationYear = 1999;
      entity.genres = ['progressive-rock'];

      await bandRepository.runTransaction(async tran => {
        const band = await tran.create(entity);
        expect(typeof band.id).to.equal('string');
        expect(band.id).not.to.be.undefined;
        expect(band.name).to.equal(entity.name);
        expect(band.formationYear).to.equal(entity.formationYear);
        expect(band.genres).to.equal(entity.genres);
      });
    });

    it('must save autogenerated id field in document if no id is passed', async () => {
      const entity = new Band();
      entity.name = 'Deftones';
      entity.formationYear = 1988;
      entity.genres = ['alternative-metal'];

      await bandRepository.runTransaction(async tran => {
        const band = await tran.create(entity);
        const foundBand = await tran.findById(band.id);
        expect(band.id).to.equal(foundBand.id);
      });
    });

    it('must be able to create document from anonymous object without id');
  });

  describe('update', () => {
    it('must update and return updated item', async () => {
      await bandRepository.runTransaction(async tran => {
        const band = await tran.findById('porcupine-tree');
        band.name = 'Steven Wilson';
        const updatedBand = await tran.update(band);
        expect(band.name).to.equal(updatedBand.name);
      });
    });

    it('must update and store updated item', async () => {
      await bandRepository.runTransaction(async tran => {
        const band = await tran.findById('porcupine-tree');
        band.name = 'Steven Wilson';
        await tran.update(band);
        const updatedBand = await tran.findById('porcupine-tree');
        expect(band.name).to.equal(updatedBand.name);
      });
    });

    it('must not validate if the validate config property is false', async () => {
      initialize(firestore, { validateModels: false });

      await bandRepository.runTransaction(async tran => {
        const band = await tran.findById('porcupine-tree');
        band.contactEmail = 'Not an email';
        await tran.update(band);
        const updatedBand = await tran.findById('porcupine-tree');
        expect(updatedBand.contactEmail).to.equal('Not an email');
      })
    });

    it('must fail validation if an invalid class is given', async () => {
      await bandRepository.runTransaction(async tran => {
        const band = await tran.findById('porcupine-tree');
  
        band.contactEmail = 'Not an email';

        try {
          await tran.update(band);
        } catch (error) {
          expect(error[0].constraints.isEmail).to.equal('Invalid email!');
        }
      })
    });

    it('must fail validation if an invalid object is given', async () => {
      await bandRepository.runTransaction(async tran => {
        const band = await tran.findById('porcupine-tree');
        const updatedBand: Partial<Band> = {
          ...band,
          contactEmail: 'Not an email',
        }

        try {
          await tran.update(band);
        } catch (error) {
          expect(error[0].constraints.isEmail).to.equal('Invalid email!');
        }
      })
    });

    it('must throw if item is not found');
  });

  describe('delete', () => {
    it('must delete item', async () => {
      await bandRepository.runTransaction(async tran => {
        await tran.delete('porcupine-tree');
        const pt = await tran.findById('porcupine-tree');
        expect(pt).to.be.null;
      });
    });

    it('must throw if item is not found', async () => {
      await bandRepository.runTransaction(async tran => {
        expect(() => tran.delete('lol')).to.throw;
      });
    });
  });

  describe('.where*', () => {
    it('whereEqualTo must accept function as first parameter', async () => {
      await bandRepository.runTransaction(async tran => {
        const list = await tran
          .whereEqualTo(b => b.name, 'Porcupine Tree')
          .find();
        expect(list.length).to.equal(1);
        expect(list[0].name).to.equal('Porcupine Tree');
      });
    });

    it('must return T[]', async () => {
      await bandRepository.runTransaction(async tran => {
        const progressiveRockBands = await tran
          .whereArrayContains('genres', 'progressive-rock')
          .find();

        progressiveRockBands.forEach(b => {
          expect(b.getPopularGenre()).to.eql(b.genres[0]);
        });
      });
    });

    it('must return same list if where filter does not apply', async () => {
      await bandRepository.runTransaction(async tran => {
        const list = await tran
          .whereGreaterOrEqualThan('formationYear', 1983)
          .find();
        expect(list.length).to.equal(2);
      });
    });

    it('must filter with whereEqualTo', async () => {
      await bandRepository.runTransaction(async tran => {
        const list = await tran.whereEqualTo('name', 'Porcupine Tree').find();
        expect(list.length).to.equal(1);
        expect(list[0].name).to.equal('Porcupine Tree');
      });
    });

    it('must filter with whereGreaterThan', async () => {
      await bandRepository.runTransaction(async tran => {
        const list = await tran.whereGreaterThan('formationYear', 1983).find();
        expect(list.length).to.equal(1);
      });
    });

    it('must filter with whereGreaterOrEqualThan', async () => {
      await bandRepository.runTransaction(async tran => {
        const list = await tran
          .whereGreaterOrEqualThan('formationYear', 1983)
          .find();
        expect(list.length).to.equal(2);
      });
    });

    it('must filter with whereLessThan', async () => {
      await bandRepository.runTransaction(async tran => {
        const list = await tran.whereLessThan('formationYear', 1983).find();

        expect(list.length).to.equal(1);
      });
    });

    it('must filter with whereLessOrEqualThan', async () => {
      await bandRepository.runTransaction(async tran => {
        const list = await tran
          .whereLessOrEqualThan('formationYear', 1983)
          .find();
        expect(list.length).to.equal(2);
      });
    });

    it('must filter with whereArrayContains', async () => {
      await bandRepository.runTransaction(async tran => {
        const list = await tran
          .whereArrayContains('genres', 'progressive-rock')
          .find();
        expect(list.length).to.equal(2);
      });
    });

    it('must filter with two or more operators', async () => {
      await bandRepository.runTransaction(async tran => {
        const list = await tran
          .whereLessOrEqualThan('formationYear', 1983)
          .whereArrayContains('genres', 'funk-rock')
          .find();
        expect(list.length).to.equal(1);
        expect(list[0].id).to.equal('red-hot-chili-peppers');
      });
    });
  });

  describe('miscellaneous', () => {
    it('should correctly parse dates', async () => {
      await bandRepository.runTransaction(async tran => {
        const pt = await tran.findById('porcupine-tree');
        expect(pt.lastShow).to.be.instanceOf(Date);
        expect(pt.lastShow.toISOString()).to.equal('2010-10-14T00:00:00.000Z');
      });
    });
  });

  describe('must handle subcollections', () => {
    it('should initialize subcollections', async () => {
      await bandRepository.runTransaction(async tran => {
        const pt = await tran.findById('porcupine-tree');
        expect(pt.name).to.equal('Porcupine Tree');
        expect(pt.albums).to.be.instanceOf(BaseFirestoreRepository);
      });
    });

    it('should be able to execute operations in the subcollection', async () => {
      await bandRepository.runTransaction(async tran => {
        const band = await tran.findById('red-hot-chili-peppers');
        const bestAlbum = await band.albums.findById('stadium-arcadium');
        expect(bestAlbum.id).to.equal('stadium-arcadium');
      });
    });

    it('should be able to create subcollections', async () => {
      const band = new Band();
      band.id = '30-seconds-to-mars';
      band.name = '30 Seconds To Mars';
      band.formationYear = 1998;
      band.genres = ['alternative-rock'];

      const firstAlbum = new Album();
      firstAlbum.id = '30-seconds-to-mars';
      firstAlbum.name = '30 Seconds to Mars';
      firstAlbum.releaseDate = new Date('2002-07-22');

      const secondAlbum = new Album();
      secondAlbum.id = 'a-beautiful-lie';
      secondAlbum.name = 'A Beautiful Lie';
      secondAlbum.releaseDate = new Date('2005-07-30');

      const thirdAlbum = new Album();
      thirdAlbum.id = 'this-is-war';
      thirdAlbum.name = 'This Is War';
      thirdAlbum.releaseDate = new Date('2009-12-08');

      await bandRepository.runTransaction(async tran => {
        await tran.create(band);
        await band.albums.create(firstAlbum);
        await band.albums.create(secondAlbum);
        await band.albums.create(thirdAlbum);

        const albums = await band.albums.find();
        expect(albums.length).to.eql(3);
      });
    });

    it('should be able to validate subcollections on create', async () => {
      const band = new Band();
      band.id = '30-seconds-to-mars';
      band.name = '30 Seconds To Mars';
      band.formationYear = 1998;
      band.genres = ['alternative-rock'];

      const firstAlbum = new Album();
      firstAlbum.id = 'invalid-album-name';
      firstAlbum.name = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.';
      firstAlbum.releaseDate = new Date('2002-07-22');

      await bandRepository.runTransaction(async tran => {
        await tran.create(band);

        try {
          await band.albums.create(firstAlbum);
        } catch (error) {
          expect(error[0].constraints.length).to.equal('Name is too long')
        }
      });
    });

    it('should be able to update subcollections', async () => {
      await bandRepository.runTransaction(async tran => {
        const pt = await tran.findById('porcupine-tree');
        const album = await pt.albums.findById('fear-blank-planet');
        album.comment = 'Anesthethize is top 3 IMHO';

        await pt.albums.update(album);

        const updatedAlbum = await pt.albums.findById('fear-blank-planet');
        expect(updatedAlbum.comment).to.eql('Anesthethize is top 3 IMHO');
      });
    });

    it('should be able to validate subcollections on update', async () => {
      await bandRepository.runTransaction(async tran => {
        const pt = await tran.findById('porcupine-tree');
        const album = await pt.albums.findById('fear-blank-planet');
        
        album.name = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.';

        try {
          await pt.albums.update(album);
        } catch (error) {
          expect(error[0].constraints.length).to.equal('Name is too long');
        }
      });
    });

    it('should be able to update collections with subcollections', async () => {
      await bandRepository.runTransaction(async tran => {
        const pt = await tran.findById('porcupine-tree');
        pt.name = 'Porcupine Tree IS THE BEST';
        const updatedPt = await tran.update(pt);
        const foundUpdatedPt = await tran.update(pt);

        expect(updatedPt.name).to.eql(pt.name);
        expect(foundUpdatedPt.name).to.eql(pt.name);
      });
    });

    it('should be able to delete subcollections', async () => {
      await bandRepository.runTransaction(async tran => {
        const pt = await tran.findById('porcupine-tree');
        await pt.albums.delete('fear-blank-planet');

        const updatedBandAlbums = await pt.albums.find();
        expect(updatedBandAlbums.length).to.eql(3);
      });
    });

    describe('miscellaneous', () => {
      it('should correctly parse dates', async () => {
        await bandRepository.runTransaction(async tran => {
          const pt = await tran.findById('porcupine-tree');
          const { releaseDate } = await pt.albums.findById('deadwing');
          expect(releaseDate).instanceOf(Date);
          expect(releaseDate.toISOString()).to.equal(
            '2005-03-25T00:00:00.000Z'
          );
        });
      });
    });
  });
});
