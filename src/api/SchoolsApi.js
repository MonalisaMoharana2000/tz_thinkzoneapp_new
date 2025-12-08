// api/schoolsApi.js
import {API} from '../environments/Api';

export const getAllSchools = async (params = {}) => {
  const {district, districtCode, block, blockCode, cluster, clusterCode} =
    params;

  return await API.get('getAllSchools', {
    params: {
      district,
      districtCode,
      block,
      blockCode,
      cluster,
      clusterCode,
    },
  });
};

export const getDistricts = async () => {
  const response = await getAllSchools();

  return {
    data: response.data.data,
    status: response.status,
  };
};

export const getBlocks = async (district, districtCode) => {
  const response = await getAllSchools({district, districtCode});

  return {
    data: response.data.data,
    status: response.status,
  };
};

export const getClusters = async (district, districtCode, block, blockCode) => {
  const response = await getAllSchools({
    district,
    districtCode,
    block,
    blockCode,
  });
  return {
    data: response.data.data,
    status: response.status,
  };
};

export const getSchools = async (
  district,
  districtCode,
  block,
  blockCode,
  cluster,
  clusterCode,
) => {
  const response = await getAllSchools({
    district,
    districtCode,
    block,
    blockCode,
    cluster,
    clusterCode,
  });
  return {
    data: response.data.data,
    status: response.status,
  };
};
