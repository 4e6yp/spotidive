import axios from '../axios-spotifyClient';

export const allSettledRequests = async (requestsArr) => {
  let allRequestsData = await Promise.allSettled(requestsArr);

  allRequestsData = allRequestsData.reduce((acc, cur) => {
    if (cur.status === 'fulfilled') {
      if (Array.isArray(cur.value)) {
        acc = acc.concat([...cur.value]);
      } else {
        acc.push(cur.value);
      }
    }
    return acc;
  }, []);
  return allRequestsData;
}

/**
 * perRequestFunction gets request response as input and should return object.
 * 
 * finishedFunciton gets array of processed objects (from each request) after all requests are finished. Should return object.
 */
export const synchFetchMultiplePages = async (url, limit, perRequestFunction) => {
  const firstPage = await axios.get(`${url}?market=from_token&limit=${limit}`);    
  const firstPageData = perRequestFunction(firstPage.data.items);

  if (!firstPage.data.next) {
    return firstPageData;
  }

  const totalPagesNum = Math.ceil(firstPage.data.total / limit);

  const fetchPageData = async (currentOffset) => {
    const requestData = await axios.get(`${url}?market=from_token&limit=${limit}&offset=${currentOffset}`);
    return perRequestFunction(requestData.data.items);
  }

  let dataRequests = [];

  for (let i=limit; i <= totalPagesNum * limit; i += limit) {
    dataRequests.push(fetchPageData(i));
  }
  
  const allPagesData = await allSettledRequests(dataRequests, firstPageData);
  return firstPageData.concat(allPagesData);
}