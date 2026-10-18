

import axios from "axios";


export const getUsers = async () => {

    const response =
        await axios.get(
            "/api/user/all",
            {
                withCredentials: true
            }
        );

    return response.data.users;
};


export const getUser = async (
    userId
) => {

    const response =
        await axios.get(
            `/api/user/get/${userId}`,
            {
                withCredentials: true
            }
        );

    return response.data.user;
};


export const createUser = async (
    userData
) => {

    const response =
        await axios.post(
            "/api/user/new",
            userData,
            {
                withCredentials: true
            }
        );

    return response.data.user;
};


export const updateUser = async (
    userId,
    userData
) => {

    const response =
        await axios.put(
            `/api/user/update/${userId}`,
            userData,
            {
                withCredentials: true
            }
        );

    return response.data.user;
};


export const changeUserPassword = async (
    userId,
    password
) => {

    const response =
        await axios.put(
            `/api/user/password/${userId}`,
            {
                password
            },
            {
                withCredentials: true
            }
        );

    return response.data;
};


export const deleteUser = async (
    userId
) => {

    const response =
        await axios.delete(
            `/api/user/delete/${userId}`,
            {
                withCredentials: true
            }
        );

    return response.data.user;
};