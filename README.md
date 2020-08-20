<img src = "src/scheduler_300x102.png" width="300"/>

# Fixarta marking scheduler
Fixarta's Scheduler is an open-source solution to allow setting a max gas price and scheduling marking operations on the Devery Protocol accordingly to your app structure and pricing.

### Note
Current solution is implemented to mark brand from the appAddress as well as products where brandAddress is involved as a marker.
Hence, we are getting to separate queues of scheduled job executed.

### The template code works as follows:
- Is being run accordingly to schedule
- prioritizes the tasks
- pushes marking tasks in a queue to allow optimizing transaction cost
- ensures app operations are being executed asynchronously even when gas price is too high or trx is being proceeded too long.

### Implementing
You can implement Fixarta scheduler model into your data structure by

## Fixarta usage example
1. Checking the status of a specific brand or its products to start proceed
```// return ID of Brand to be processed
async function findBrandJob(){
	const brandsRef = firestore.collection('brands');
	var snapshot = await brandsRef.where('status', '==', 'queue').get();
	if (!snapshot.empty) return snapshot.docs[0].id;	
}
async function findProductJob(){
	// this needs to be improved a bit to support running jobs for different brands in parallel
	const brandsRef = firestore.collection('products');
	var snapshot = await brandsRef.where('status', '==', 'queue').get();
	if (!snapshot.empty) return snapshot.docs[0].id;
```

2.Detecting currently executed process. Returns Boolean where 'false' means the job can be run otherwise job will be added to a queue and scheduled.
```async function isJobRunning(){
	const brandsRef = firestore.collection('brands');
	var snapshot = await brandsRef.where('status', '==', 'progress').get();
	if (!snapshot.empty) return true;

	const productsRef = firestore.collection('products');
	var snapshot = await productsRef.where('status', '==', 'progress').get();
	if (!snapshot.empty) return true;

    return false; // we are good to go    	
}
```

3. On this step desicion to execute current job is being made accordingly to the Boolean value we got previousely.
Conditions to break/schedule the job:
- brand registered by current user exists (brand and user have the same id) 
- current gas price is higher than maxGasPrice
- there is a running job
```async function processProductJob(jobId){
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
```

  3.1. Calling DeveryJS to initialize marking process
  ```const { wallet }  = await addBrand(brandSnapshot.data().name);
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
  ```
  3.2. Listening to EthGasStation to get current gas price to be compared to maxGasPrice set to reduce extra cost paid for transaction 
  ```async function isGasPriceAffordable(){
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
  ```
  3.3. Detecting if there is a running job to exit marking process
  ```if (await isJobRunning()) {
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
  ```
