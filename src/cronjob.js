let admin = require('firebase-admin');
const { firestore } = require('./FirebaseBridge');
require('dotenv').config();
var axios = require('axios');
const { addBrand, getNetworkId, safeGenerateProductAddress, addAndClaimProduct } = require('./DeveryBridge');


// return ID of Brand to be processed
async function findBrandJob(){
	const brandsRef = firestore.collection('brands');
	var snapshot = await brandsRef.where('status', '==', 'queue').get();
	if (!snapshot.empty) return snapshot.docs[0].id;	
}

// return ID of Product to be processed
async function findProductJob(){
	// this needs to be improved a bit to support running jobs for different brands in parallel
	const brandsRef = firestore.collection('products');
	var snapshot = await brandsRef.where('status', '==', 'queue').get();
	if (!snapshot.empty) return snapshot.docs[0].id;
}

// detect the running job

async function isJobRunning(){
	const brandsRef = firestore.collection('brands');
	var snapshot = await brandsRef.where('status', '==', 'progress').get();
	if (!snapshot.empty) return true;

	const productsRef = firestore.collection('products');
	var snapshot = await productsRef.where('status', '==', 'progress').get();
	if (!snapshot.empty) return true;

    return false; // we are good to go    	
}

// process scheduled brand job: create new product
async function processProductJob(jobId){
	console.log(' processProductJob( %s )', jobId);
	const prodRef = firestore.doc(`products/${jobId}`);

	try {
		const prodSnapshot = await prodRef.get();
		if (!prodSnapshot.exists) throw 'Unable to fetch brand (should never happen)';
		await prodRef.update({status:'progress'});	

		const brandId = prodSnapshot.data().author;

		const userRef = firestore.doc(`users/${brandId}`); // user and brand have the same ID
	    const userSnapshot = await userRef.get();
	    if (!userSnapshot.exists) throw 'Unable to fetch user (should never happen)';

		const brandRef = firestore.doc(`brands/${brandId}`);
		const brandSnapshot = await brandRef.get();
		if (!brandSnapshot.exists) throw 'Unable to fetch brand (should never happen)';

		const productAddress = await safeGenerateProductAddress();

		console.log('Add product: all OK, going to create and claim at ', productAddress, prodSnapshot.data().name, prodSnapshot.data().details, prodSnapshot.data().year, prodSnapshot.data().origin );
        console.log('Brand address is ', brandSnapshot.data().address);
        await addAndClaimProduct(productAddress, brandSnapshot.data().privateKey, brandSnapshot.data().address, userSnapshot.data().address ,
            prodSnapshot.data().name, prodSnapshot.data().style, prodSnapshot.data().year, prodSnapshot.data().origin);
        console.log('Product created in Devery, update database');

        await prodRef.update({
        	status:'done', 
        	networkId: getNetworkId(),
        	address: productAddress
    	});
 
	    console.log('ProductJob completed, status is Done');
    } 
    catch (error) {
    	console.log('processProductJob failed: ', error);
    	await prodRef.update({status:'fail', error: error });
    }  


}

// process scheduled brand job: create new brand
async function processBrandJob(jobId){
	console.log('processBrandJob( %s )', jobId);
	const brandRef = firestore.doc(`brands/${jobId}`);
	try {
		const brandSnapshot = await brandRef.get();
		if (!brandSnapshot.exists) throw 'Unable to fetch brand (should never happen)';
		await brandRef.update({status:'progress'});

		const userRef = firestore.doc(`users/${jobId}`); // user and brand have the same ID
	    const userSnapshot = await userRef.get();
	    if (!userSnapshot.exists) throw 'Unable to fetch user (should never happen)';
	    // call Devery
        const { wallet }  = await addBrand(brandSnapshot.data().name);
        console.log('Brand Create: Devery brand create OK');
        const {address, privateKey, mnemonic } = wallet;
        await brandRef.update({
        	status:'done', 
        	networkId: getNetworkId(),
        	address: address,
        	privateKey: privateKey,
        	mnemonic: mnemonic
    	});
    	console.log('BrandJob completed, status is Done');
    } 
    catch (error) {
    	console.log('processBrandJob failed: ', error);
    	await brandRef.update({status:'fail', error: error });
    }    
}

async function isGasPriceAffordable(){
	const maxGasPrice = parseInt( process.env.MAX_GAS_PRICE );
    let response = await axios.get('https://ethgasstation.info/json/ethgasAPI.json');
    if ( response.data.average/10 > maxGasPrice) {
    	console.log('Current gas price (%s) exceeds allowed (%s). Aborting execution.', response.data.average/10, maxGasPrice);
    	return false;
    }
    console.log('Gas price OK (%s), allowed %s', response.data.average/10, maxGasPrice);

	return true;
}



async function cleanStalledJobs(){
	console.log('Cleaning stalled jobs');
	// ToDo: this needs implementation
}

async function doCronJob() {
    console.log('Starting cron job');
   
    // this needs implementation 
    // await cleanStalledJobs(); 

    if (! await isGasPriceAffordable() ) {
    	// gas price is bigger than we can afford
    	return;
    }

    // detect if there is a job running, exit if so. here we will need some sophisticated logic 
    if (await isJobRunning()) {
    	console.log('Other job is running, exiting');
    	return;
    }

    const brandJobId = await findBrandJob();
    if ( brandJobId ) {
    	console.log('Found brand job:', brandJobId );
    	await processBrandJob(brandJobId);
    	console.log('Brand job %s completed, exiting', brandJobId );
    	return; 
    }

    const productJobId = await findProductJob();
    if ( productJobId ) {
    	console.log('Found product job:', productJobId );
        await processProductJob(productJobId);
    	console.log('Product job %s completed, exiting', productJobId );	
    	return; 
    }

    console.log('No jobs at the moment.');
}

doCronJob();